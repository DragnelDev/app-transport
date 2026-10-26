import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { EstadoPagoQr } from '../common/enums';
import { AuthUser } from '../common/interfaces/auth-user';
import { EventsGateway } from '../events/events.gateway';
import { PagoQr } from './entities/pago-qr.entity';
import { HttpQrProvider } from './providers/http.provider';
import { MockQrProvider } from './providers/mock.provider';
import { QrProvider } from './providers/qr-provider';

@Injectable()
export class PagosQrService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PagosQrService.name);
  private readonly provider: QrProvider;
  private readonly modo: string;
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(PagoQr) private readonly repo: Repository<PagoQr>,
    private readonly cfg: ConfigService,
    private readonly events: EventsGateway,
  ) {
    this.modo = cfg.get('PAYMENT_PROVIDER') ?? 'mock';
    this.provider =
      this.modo === 'http'
        ? new HttpQrProvider(
            cfg.getOrThrow('PAYMENT_API_URL'),
            cfg.getOrThrow('PAYMENT_API_KEY'),
          )
        : new MockQrProvider();
  }

  onModuleInit() {
    this.timer = setInterval(
      () => this.expirarVencidos().catch(() => undefined),
      60_000,
    );
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async generar(monto: number, glosa: string | undefined, user: AuthUser) {
    const referencia = `TR-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
    const minutos = Number(this.cfg.get('PAYMENT_QR_EXPIRES_MINUTES') ?? 15);
    const qr = await this.provider.generar({
      monto,
      glosa: glosa ?? 'Pago servicio de transporte',
      referencia,
      expiraEnMinutos: minutos,
    });
    return this.repo.save(
      this.repo.create({
        referencia,
        transaccionIdBanco: qr.transaccionId,
        imagenQrBase64: qr.imagenBase64,
        monto,
        glosa: glosa ?? null,
        fechaExpiracion: qr.expiraAt,
        createdBy: user.id,
      }),
    );
  }

  async obtener(id: number) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Pago QR no encontrado');
    if (p.estado === EstadoPagoQr.Pendiente && p.fechaExpiracion < new Date()) {
      p.estado = EstadoPagoQr.Expirado;
      await this.repo.save(p);
      this.events.emit('pago:actualizado', { id: p.id, estado: p.estado });
    }
    return p;
  }

  async expirarVencidos() {
    const vencidos = await this.repo.find({
      where: {
        estado: EstadoPagoQr.Pendiente,
        fechaExpiracion: LessThan(new Date()),
      },
    });
    for (const p of vencidos) {
      await this.repo.update(p.id, { estado: EstadoPagoQr.Expirado });
      this.events.emit('pago:actualizado', {
        id: p.id,
        estado: EstadoPagoQr.Expirado,
      });
    }
  }

  // -------------------- Webhook --------------------

  private verificarFirma(rawBody: Buffer | undefined, firma?: string) {
    const secreto = this.cfg.get<string>('PAYMENT_WEBHOOK_SECRET');
    if (!secreto) {
      if (this.modo !== 'mock')
        throw new ForbiddenException('Webhook sin secreto configurado');
      return;
    }
    if (!rawBody || !firma) throw new UnauthorizedException('Firma requerida');
    const esperado = createHmac('sha256', secreto)
      .update(rawBody)
      .digest('hex');
    const recibido = firma.replace(/^sha256=/, '');
    const a = Buffer.from(esperado);
    const b = Buffer.from(recibido);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new UnauthorizedException('Firma inválida');
  }

  async procesarWebhook(
    rawBody: Buffer | undefined,
    firma: string | undefined,
    body: any,
  ) {
    this.verificarFirma(rawBody, firma);
    const evento = this.provider.parsearWebhook(body);
    if (!evento.transaccionId && !evento.referencia)
      throw new BadRequestException('Webhook sin identificador');

    const pago = await this.repo.findOne({
      where: evento.transaccionId
        ? { transaccionIdBanco: evento.transaccionId }
        : { referencia: evento.referencia! },
    });
    if (!pago) throw new NotFoundException('Transacción desconocida');
    if (pago.estado === EstadoPagoQr.Completado)
      return { ok: true, duplicado: true };

    if (!evento.pagado) {
      pago.estado = EstadoPagoQr.Fallido;
    } else if (
      evento.monto !== undefined &&
      Math.abs(evento.monto - pago.monto) > 0.009
    ) {
      this.logger.warn(
        `Monto inconsistente en pago ${pago.id}: esperado ${pago.monto}, recibido ${evento.monto}`,
      );
      pago.estado = EstadoPagoQr.Fallido;
    } else {
      pago.estado = EstadoPagoQr.Completado;
      pago.fechaConfirmacion = new Date();
    }
    await this.repo.save(pago);
    this.events.emit('pago:actualizado', { id: pago.id, estado: pago.estado });
    return { ok: true };
  }

  /** Solo con proveedor mock: simula que el cliente pagó desde su app bancaria. */
  async simular(id: number) {
    if (this.modo !== 'mock')
      throw new ForbiddenException('Disponible solo con PAYMENT_PROVIDER=mock');
    const p = await this.obtener(id);
    if (p.estado !== EstadoPagoQr.Pendiente)
      throw new BadRequestException(`El pago está ${p.estado}`);
    p.estado = EstadoPagoQr.Completado;
    p.fechaConfirmacion = new Date();
    await this.repo.save(p);
    this.events.emit('pago:actualizado', { id: p.id, estado: p.estado });
    return p;
  }

  /**
   * Verifica que el pago esté Completado, coincida el monto y no haya sido usado;
   * lo marca como utilizado dentro de la transacción del llamador.
   */
  async consumir(em: EntityManager, pagoQrId: number, monto: number) {
    const pago = await em.findOne(PagoQr, {
      where: { id: pagoQrId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!pago) throw new BadRequestException('Pago QR inexistente');
    if (pago.estado !== EstadoPagoQr.Completado) {
      throw new BadRequestException(
        'El pago QR aún no está confirmado por el banco',
      );
    }
    if (pago.utilizado)
      throw new BadRequestException('Este pago QR ya fue utilizado');
    if (Math.abs(pago.monto - monto) > 0.009) {
      throw new BadRequestException(
        `El monto del QR (Bs ${pago.monto}) no coincide con el cobro (Bs ${monto})`,
      );
    }
    pago.utilizado = true;
    await em.save(pago);
    return pago;
  }
}
