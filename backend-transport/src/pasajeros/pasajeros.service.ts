import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';
import { EstadoSalida, MetodoPago, TipoNotificacion } from '../common/enums';
import { AuthUser } from '../common/interfaces/auth-user';
import { EscPos } from '../common/utils/escpos';
import { EventsGateway } from '../events/events.gateway';
import { Mensajes } from '../notificaciones/mensajes';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PagosQrService } from '../pagos-qr/pagos-qr.service';
import { Salida } from '../salidas/entities/salida.entity';
import { Pasajero } from './entities/pasajero.entity';
import { ActualizarPasajeroDto, VenderPasajeDto } from './dto/pasajeros.dto';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class PasajerosService {
  constructor(
    @InjectRepository(Pasajero) private readonly repo: Repository<Pasajero>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly pagos: PagosQrService,
    private readonly events: EventsGateway,
    private readonly notificaciones: NotificacionesService,
    private readonly cfg: ConfigService,
  ) {}

  async list(
    params: { salidaId?: number; q?: string; anulados?: boolean },
    user: AuthUser,
  ) {
    const base: any = params.salidaId ? { salidaId: params.salidaId } : {};
    const where = params.q
      ? [
          { ...base, nombrePasajero: ILike(`%${params.q}%`) },
          { ...base, documentoIdentidad: ILike(`%${params.q}%`) },
        ]
      : base;
    return this.repo.find({
      where,
      relations: { salida: { ruta: true, camioneta: true }, creador: true },
      withDeleted: !!params.anulados && user.rol === 'Administrador',
      order: { id: 'DESC' },
      take: 300,
    });
  }

  async findOne(id: number) {
    const p = await this.repo.findOne({
      where: { id },
      relations: { salida: { ruta: true, camioneta: true }, creador: true },
      withDeleted: true,
    });
    if (!p) throw new NotFoundException('Pasaje no encontrado');
    return p;
  }

  private validarAsiento(salida: Salida, numero: number) {
    if (numero > salida.capacidadMaximaTurno) {
      throw new BadRequestException(
        numero === 8
          ? 'El asiento 8 (medio delantero) no está habilitado para esta salida'
          : `El asiento ${numero} no existe en esta salida`,
      );
    }
  }

  private async lockSalida(em: EntityManager, id: number): Promise<Salida> {
    // Bloqueo por fila: serializa ventas concurrentes de una misma salida
    const s = await em.findOne(Salida, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!s) throw new NotFoundException('Salida no encontrada');
    return s;
  }

  async vender(dto: VenderPasajeDto, user: AuthUser) {
    const pasajero = await this.ds
      .transaction(async (em) => {
        const salida = await this.lockSalida(em, dto.salidaId);
        if (salida.estado !== EstadoSalida.Programado) {
          throw new BadRequestException(
            `No se pueden vender pasajes: la salida está "${salida.estado}"`,
          );
        }
        this.validarAsiento(salida, dto.numeroAsiento);

        const ocupado = await em.exists(Pasajero, {
          where: { salidaId: salida.id, numeroAsiento: dto.numeroAsiento },
        });
        if (ocupado)
          throw new ConflictException(
            `El asiento ${dto.numeroAsiento} ya está ocupado`,
          );

        const ruta = await em.findOneOrFail(Salida, {
          where: { id: salida.id },
          relations: { ruta: true },
        });
        const monto = dto.montoPago ?? ruta.ruta!.tarifaBase;

        if (dto.metodoPago === MetodoPago.QR) {
          if (!dto.pagoQrId)
            throw new BadRequestException(
              'Debe generar y confirmar el pago QR',
            );
          await this.pagos.consumir(em, dto.pagoQrId, monto);
        }

        return em.save(
          em.create(Pasajero, {
            salidaId: salida.id,
            numeroAsiento: dto.numeroAsiento,
            nombrePasajero: dto.nombrePasajero.trim(),
            documentoIdentidad: dto.documentoIdentidad.trim(),
            telefono: dto.telefono.trim(),
            paradaDestino: dto.paradaDestino ?? null,
            montoPago: monto,
            metodoPago: dto.metodoPago,
            pagoQrId: dto.metodoPago === MetodoPago.QR ? dto.pagoQrId! : null,
            createdBy: user.id,
            updatedBy: user.id,
          }),
        );
      })
      .catch((err) => {
        if (err?.code === UNIQUE_VIOLATION)
          throw new ConflictException(
            'El asiento ya fue vendido por otra operadora',
          );
        throw err;
      });

    this.events.emit('salida:asientos', { salidaId: pasajero.salidaId });
    const completo = await this.findOne(pasajero.id);

    if (this.cfg.get('NOTIFY_PASSENGER_TICKET') !== 'false') {
      await this.notificaciones.encolar(
        TipoNotificacion.PasajeConfirmacion,
        completo.telefono,
        Mensajes.pasajeConfirmacion({
          nombre: completo.nombrePasajero,
          asiento: completo.numeroAsiento,
          fecha: completo.salida!.fechaHoraProgramada.toLocaleString('es-BO'),
          origen: completo.salida!.ruta!.origen,
          destino: completo.salida!.ruta!.destino,
          monto: completo.montoPago,
        }),
        { tipo: 'pasajero', id: completo.id },
      );
    }
    return completo;
  }

  async actualizar(id: number, dto: ActualizarPasajeroDto, user: AuthUser) {
    const salidaId = await this.ds.transaction(async (em) => {
      const actual = await em.findOne(Pasajero, { where: { id } });
      if (!actual) throw new NotFoundException('Pasaje no encontrado');
      if (actual.cierreCajaId)
        throw new ConflictException(
          'El pasaje pertenece a una caja ya cerrada',
        );

      const salida = await this.lockSalida(em, actual.salidaId);
      if (
        salida.estado !== EstadoSalida.Programado &&
        user.rol !== 'Administrador'
      ) {
        throw new BadRequestException('La salida ya no está programada');
      }
      if (dto.numeroAsiento && dto.numeroAsiento !== actual.numeroAsiento) {
        this.validarAsiento(salida, dto.numeroAsiento);
        if (
          await em.exists(Pasajero, {
            where: { salidaId: salida.id, numeroAsiento: dto.numeroAsiento },
          })
        ) {
          throw new ConflictException(
            `El asiento ${dto.numeroAsiento} ya está ocupado`,
          );
        }
      }
      Object.assign(actual, dto, { updatedBy: user.id });
      await em.save(actual);
      return salida.id;
    });
    this.events.emit('salida:asientos', { salidaId });
    return this.findOne(id);
  }

  /** Anulación = soft delete (se conserva para auditoría). */
  async anular(id: number, motivo: string | undefined, user: AuthUser) {
    const p = await this.repo.findOne({
      where: { id },
      relations: { salida: true },
    });
    if (!p) throw new NotFoundException('Pasaje no encontrado');
    if (p.cierreCajaId)
      throw new ConflictException(
        'El pasaje pertenece a una caja ya cerrada y no puede anularse',
      );
    if (
      p.salida!.estado !== EstadoSalida.Programado &&
      user.rol !== 'Administrador'
    ) {
      throw new BadRequestException(
        'La salida ya no está programada; solo un administrador puede anular',
      );
    }
    await this.repo.update(id, {
      updatedBy: user.id,
      motivoAnulacion: motivo ?? null,
    });
    await this.repo.softDelete(id);
    this.events.emit('salida:asientos', { salidaId: p.salidaId });
    return { ok: true };
  }

  /** Boleto en bytes ESC/POS (58mm = 32 col, 80mm = 48 col). */
  async ticketEscPos(id: number, columnas = 32) {
    const p = await this.findOne(id);
    const e = new EscPos(columnas);
    e.align('center')
      .bold(true)
      .size(true)
      .text('BOLETO')
      .size(false)
      .bold(false);
    e.text(`${p.salida!.ruta!.origen} - ${p.salida!.ruta!.destino}`).line();
    e.align('left');
    e.pair('Salida:', p.salida!.fechaHoraProgramada.toLocaleString('es-BO'));
    e.pair('Placa:', p.salida!.camioneta!.placa);
    e.pair('Asiento:', String(p.numeroAsiento));
    e.text(`Pasajero: ${p.nombrePasajero}`);
    e.text(`CI: ${p.documentoIdentidad}`);
    if (p.paradaDestino) e.text(`Baja en: ${p.paradaDestino}`);
    e.line()
      .pair('TOTAL Bs', p.montoPago.toFixed(2))
      .pair('Pago:', p.metodoPago)
      .line();
    e.align('center').qr(`PAS-${p.id}-${p.salidaId}-${p.numeroAsiento}`, 5);
    e.text(`Boleto #${p.id}`).cut();
    return e.build();
  }
}
