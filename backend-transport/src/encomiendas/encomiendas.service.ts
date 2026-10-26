import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import {
  EstadoEntrega,
  EstadoSalida,
  MetodoPago,
  TipoNotificacion,
  TipoPagoEncomienda,
} from '../common/enums';
import { AuthUser } from '../common/interfaces/auth-user';
import { EscPos } from '../common/utils/escpos';
import { EventsGateway } from '../events/events.gateway';
import { Mensajes } from '../notificaciones/mensajes';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PagosQrService } from '../pagos-qr/pagos-qr.service';
import { Salida } from '../salidas/entities/salida.entity';
import { Encomienda } from './entities/encomienda.entity';
import {
  ActualizarEncomiendaDto,
  CobrarDto,
  CreateEncomiendaDto,
  EntregarDto,
} from './dto/encomiendas.dto';
const REL = {
  salida: { ruta: true, camioneta: true },
  creador: true,
  modificador: true,
} as const;

@Injectable()
export class EncomiendasService implements OnModuleInit {
  constructor(
    @InjectRepository(Encomienda) private readonly repo: Repository<Encomienda>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly pagos: PagosQrService,
    private readonly notificaciones: NotificacionesService,
    private readonly events: EventsGateway,
  ) {}

  async onModuleInit() {
    await this.ds.query(
      'CREATE SEQUENCE IF NOT EXISTS seq_encomienda_guia START 1000',
    );
  }

  private async nuevoCodigo(em: EntityManager) {
    const [{ n }] = await em.query(
      "SELECT nextval('seq_encomienda_guia') AS n",
    );
    return `ENC-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
  }

  // ---------------------------- consultas ----------------------------

  async list(f: {
    q?: string;
    estado?: EstadoEntrega;
    salidaId?: number;
    pendientePago?: boolean;
    oficinaDestino?: string;
  }) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.salida', 's')
      .leftJoinAndSelect('s.ruta', 'r')
      .leftJoinAndSelect('s.camioneta', 'c')
      .leftJoinAndSelect('e.creador', 'cr')
      .orderBy('e.id', 'DESC')
      .take(300);

    if (f.estado)
      qb.andWhere('e.estado_entrega = :estado', { estado: f.estado });
    if (f.salidaId) qb.andWhere('e.salida_id = :sid', { sid: f.salidaId });
    if (f.pendientePago) qb.andWhere('e.pagado = false');
    if (f.oficinaDestino)
      qb.andWhere('e.oficina_destino ILIKE :od', { od: f.oficinaDestino });
    if (f.q) {
      qb.andWhere(
        new Brackets((w) => {
          const like = `%${f.q}%`;
          w.where('e.codigo_guia ILIKE :like', { like })
            .orWhere('e.destinatario_nombre ILIKE :like')
            .orWhere('e.remitente_nombre ILIKE :like')
            .orWhere('e.destinatario_ci ILIKE :like')
            .orWhere('e.destinatario_telefono ILIKE :like')
            .orWhere('e.remitente_telefono ILIKE :like');
        }),
      );
    }
    return qb.getMany();
  }

  /** Búsqueda rápida para el módulo de entrega (QR / CI / teléfono). */
  buscar(q: string) {
    return this.list({ q: q.trim() });
  }

  async findOne(id: number) {
    const e = await this.repo.findOne({ where: { id }, relations: REL });
    if (!e) throw new NotFoundException('Encomienda no encontrada');
    return e;
  }

  // ---------------------------- registro ----------------------------

  async create(dto: CreateEncomiendaDto, user: AuthUser) {
    if (dto.tipoPago === TipoPagoEncomienda.Origen && !dto.metodoPago) {
      throw new BadRequestException(
        'Indique el método de pago (Efectivo o QR)',
      );
    }

    const id = await this.ds.transaction(async (em) => {
      let salida: Salida | null = null;
      if (dto.salidaId) {
        salida = await em.findOne(Salida, {
          where: { id: dto.salidaId },
          relations: { ruta: true },
        });
        this.validarSalidaAsignable(salida);
      }

      const pagaEnOrigen = dto.tipoPago === TipoPagoEncomienda.Origen;
      if (pagaEnOrigen && dto.metodoPago === MetodoPago.QR) {
        if (!dto.pagoQrId)
          throw new BadRequestException('Debe generar y confirmar el pago QR');
        await this.pagos.consumir(em, dto.pagoQrId, dto.montoCobrado);
      }

      const e = em.create(Encomienda, {
        codigoGuia: await this.nuevoCodigo(em),
        salidaId: salida?.id ?? null,
        remitenteNombre: dto.remitenteNombre.trim(),
        remitenteCi: dto.remitenteCi ?? null,
        remitenteTelefono: dto.remitenteTelefono.trim(),
        destinatarioNombre: dto.destinatarioNombre.trim(),
        destinatarioCi: dto.destinatarioCi ?? null,
        destinatarioTelefono: dto.destinatarioTelefono.trim(),
        descripcion: dto.descripcion,
        cantidadBultos: dto.cantidadBultos ?? 1,
        pesoEstimado: dto.pesoEstimado ?? null,
        tipoEmpaque: dto.tipoEmpaque ?? null,
        oficinaOrigen: user.oficinaSucursal,
        oficinaDestino: dto.oficinaDestino ?? salida?.ruta?.destino ?? null,
        montoCobrado: dto.montoCobrado,
        tipoPago: dto.tipoPago,
        metodoPago: pagaEnOrigen ? dto.metodoPago! : null,
        pagoQrId:
          pagaEnOrigen && dto.metodoPago === MetodoPago.QR
            ? dto.pagoQrId!
            : null,
        pagado: pagaEnOrigen,
        pagadoAt: pagaEnOrigen ? new Date() : null,
        pagadoBy: pagaEnOrigen ? user.id : null,
        estadoEntrega: EstadoEntrega.EnOrigen,
        createdBy: user.id,
        updatedBy: user.id,
      });
      return (await em.save(e)).id;
    });

    this.events.emit('encomienda:actualizada', { id });
    return this.findOne(id);
  }

  async actualizar(id: number, dto: ActualizarEncomiendaDto, user: AuthUser) {
    const e = await this.findOne(id);
    if (e.estadoEntrega === EstadoEntrega.Entregado)
      throw new ConflictException('La encomienda ya fue entregada');
    Object.assign(e, dto, { updatedBy: user.id });
    await this.repo.save(e);
    return this.findOne(id);
  }

  // ---------------------------- flujo ----------------------------

  private validarSalidaAsignable(salida: Salida | null) {
    if (!salida) throw new NotFoundException('Salida no encontrada');
    if (
      ![EstadoSalida.Programado, EstadoSalida.EnTrayecto].includes(
        salida.estado,
      )
    ) {
      throw new BadRequestException(
        `La salida está "${salida.estado}" y no admite encomiendas`,
      );
    }
  }

  async asignarSalida(id: number, salidaId: number, user: AuthUser) {
    const e = await this.findOne(id);
    if (e.estadoEntrega !== EstadoEntrega.EnOrigen) {
      throw new ConflictException(
        'Solo se puede asignar una encomienda que sigue en la oficina de origen',
      );
    }
    const salida = await this.ds
      .getRepository(Salida)
      .findOne({ where: { id: salidaId }, relations: { ruta: true } });
    this.validarSalidaAsignable(salida);

    e.salidaId = salidaId;
    e.oficinaDestino = e.oficinaDestino ?? salida!.ruta!.destino;
    e.updatedBy = user.id;
    if (salida!.estado === EstadoSalida.EnTrayecto)
      e.estadoEntrega = EstadoEntrega.EnViaje;
    await this.repo.save(e);

    if (e.estadoEntrega === EstadoEntrega.EnViaje)
      await this.notificarSalida(e);
    this.events.emit('encomienda:actualizada', { id });
    return this.findOne(id);
  }

  private async registrarCobro(
    em: EntityManager,
    e: Encomienda,
    dto: CobrarDto,
    user: AuthUser,
  ) {
    if (e.pagado) throw new ConflictException('La encomienda ya está cobrada');
    if (dto.metodoPago === MetodoPago.QR) {
      if (!dto.pagoQrId)
        throw new BadRequestException('Debe generar y confirmar el pago QR');
      await this.pagos.consumir(em, dto.pagoQrId, e.montoCobrado);
      e.pagoQrId = dto.pagoQrId;
    }
    e.metodoPago = dto.metodoPago;
    e.pagado = true;
    e.pagadoAt = new Date();
    e.pagadoBy = user.id;
    e.updatedBy = user.id;
  }

  async cobrar(id: number, dto: CobrarDto, user: AuthUser) {
    await this.ds.transaction(async (em) => {
      const e = await em.findOne(Encomienda, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!e) throw new NotFoundException('Encomienda no encontrada');
      await this.registrarCobro(em, e, dto, user);
      await em.save(e);
    });
    this.events.emit('encomienda:actualizada', { id });
    return this.findOne(id);
  }

  async marcarListo(id: number, user: AuthUser) {
    const e = await this.findOne(id);
    if (e.estadoEntrega !== EstadoEntrega.EnViaje) {
      throw new ConflictException(
        'Solo una encomienda "En Carga/Viaje" puede marcarse como lista en destino',
      );
    }
    e.estadoEntrega = EstadoEntrega.ListoDestino;
    e.updatedBy = user.id;
    await this.repo.save(e);
    await this.notificarLista(e);
    this.events.emit('encomienda:actualizada', { id });
    return this.findOne(id);
  }

  async entregar(id: number, dto: EntregarDto, user: AuthUser) {
    await this.ds.transaction(async (em) => {
      const e = await em.findOne(Encomienda, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!e) throw new NotFoundException('Encomienda no encontrada');
      if (e.estadoEntrega !== EstadoEntrega.ListoDestino) {
        throw new ConflictException(
          'La encomienda debe estar "Listo en Oficina Destino" para entregarse',
        );
      }
      if (!e.pagado) {
        if (!dto.metodoPago) {
          throw new BadRequestException(
            'Pago contra entrega: debe cobrar antes de entregar el paquete',
          );
        }
        await this.registrarCobro(
          em,
          e,
          { metodoPago: dto.metodoPago, pagoQrId: dto.pagoQrId },
          user,
        );
      }
      e.estadoEntrega = EstadoEntrega.Entregado;
      e.entregadoAt = new Date();
      e.recibidoPorNombre = dto.recibidoPorNombre ?? e.destinatarioNombre;
      e.recibidoPorCi = dto.recibidoPorCi ?? e.destinatarioCi;
      e.updatedBy = user.id;
      await em.save(e);
    });
    const e = await this.findOne(id);
    await this.notificaciones.encolar(
      TipoNotificacion.EncomiendaEntregada,
      e.remitenteTelefono,
      Mensajes.encomiendaEntregada(e),
      { tipo: 'encomienda', id },
    );
    this.events.emit('encomienda:actualizada', { id });
    return e;
  }

  // ------------- transiciones disparadas por el estado de la salida -------------

  /** Llamado por SalidasService al cambiar el estado de un viaje. */
  async avanzarPorSalida(
    salidaId: number,
    estado: EstadoSalida,
    userId: number,
  ) {
    if (estado === EstadoSalida.EnTrayecto) {
      const lote = await this.repo.find({
        where: { salidaId, estadoEntrega: EstadoEntrega.EnOrigen },
      });
      for (const e of lote) {
        await this.repo.update(e.id, {
          estadoEntrega: EstadoEntrega.EnViaje,
          updatedBy: userId,
        });
        await this.notificarSalida(e);
      }
    } else if (estado === EstadoSalida.Finalizado) {
      const lote = await this.repo.find({
        where: { salidaId, estadoEntrega: EstadoEntrega.EnViaje },
      });
      for (const e of lote) {
        await this.repo.update(e.id, {
          estadoEntrega: EstadoEntrega.ListoDestino,
          updatedBy: userId,
        });
        await this.notificarLista({
          ...e,
          estadoEntrega: EstadoEntrega.ListoDestino,
        });
      }
    } else if (estado === EstadoSalida.Cancelado) {
      await this.repo.update(
        { salidaId, estadoEntrega: EstadoEntrega.EnOrigen },
        { salidaId: null, updatedBy: userId },
      );
    }
    this.events.emit('encomienda:actualizada', { salidaId });
  }

  private notificarSalida(e: Encomienda) {
    return this.notificaciones.encolar(
      TipoNotificacion.EncomiendaSalida,
      e.remitenteTelefono,
      Mensajes.encomiendaSalida(e),
      { tipo: 'encomienda', id: e.id },
    );
  }

  private notificarLista(e: Encomienda) {
    return this.notificaciones.encolar(
      TipoNotificacion.EncomiendaLista,
      e.destinatarioTelefono,
      Mensajes.encomiendaLista(e),
      { tipo: 'encomienda', id: e.id },
    );
  }

  // ---------------------------- impresión ----------------------------

  async etiquetaEscPos(id: number, columnas = 32) {
    const e = await this.findOne(id);
    const p = new EscPos(columnas);
    p.align('center')
      .bold(true)
      .size(true)
      .text(e.codigoGuia)
      .size(false)
      .bold(false);
    p.qr(e.codigoGuia, 7).align('left').line();
    p.text(`De: ${e.remitenteNombre}`);
    p.text(`Para: ${e.destinatarioNombre}`);
    p.text(`Tel: ${e.destinatarioTelefono}`);
    p.text(`Destino: ${e.oficinaDestino ?? '-'}`);
    p.text(`Bultos: ${e.cantidadBultos}`);
    p.line();
    p.bold(true)
      .text(e.pagado ? 'PAGADO' : `COBRAR Bs ${e.montoCobrado.toFixed(2)}`)
      .bold(false);
    return p.cut().build();
  }
}
