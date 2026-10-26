import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThanOrEqual, Repository } from 'typeorm';
import { EstadoSalida, TipoNotificacion } from '../common/enums';
import { AuthUser } from '../common/interfaces/auth-user';
import { EncomiendasService } from '../encomiendas/encomiendas.service';
import { EventsGateway } from '../events/events.gateway';
import { Mensajes } from '../notificaciones/mensajes';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ManifiestoService } from './manifiesto.service';
import { Salida } from './entities/salida.entity';
import { CreateSalidaDto, UpdateSalidaDto } from './dto/salidas.dto';
import { Camioneta } from 'src/camionetas/entities/camioneta.entity';
import { Ruta } from 'src/rutas/entities/ruta.entity';
import { Pasajero } from 'src/pasajeros/entities/pasajero.entity';

const REL = {
  camioneta: true,
  ruta: true,
  creador: true,
  modificador: true,
} as const;

const TRANSICIONES: Record<EstadoSalida, EstadoSalida[]> = {
  [EstadoSalida.Programado]: [EstadoSalida.EnTrayecto, EstadoSalida.Cancelado],
  [EstadoSalida.EnTrayecto]: [EstadoSalida.Finalizado],
  [EstadoSalida.Finalizado]: [],
  [EstadoSalida.Cancelado]: [],
};

@Injectable()
export class SalidasService {
  constructor(
    @InjectRepository(Salida) private readonly repo: Repository<Salida>,
    @InjectRepository(Pasajero)
    private readonly pasajeros: Repository<Pasajero>,
    @InjectRepository(Camioneta)
    private readonly camionetas: Repository<Camioneta>,
    @InjectRepository(Ruta) private readonly rutas: Repository<Ruta>,
    private readonly encomiendas: EncomiendasService,
    private readonly manifiesto: ManifiestoService,
    private readonly notificaciones: NotificacionesService,
    private readonly events: EventsGateway,
  ) {}

  private async conOcupacion(salidas: Salida[]) {
    if (!salidas.length) return [];
    const filas: { salida_id: number; n: string }[] = await this.pasajeros
      .createQueryBuilder('p')
      .select('p.salida_id', 'salida_id')
      .addSelect('COUNT(*)', 'n')
      .where('p.salida_id IN (:...ids)', { ids: salidas.map((s) => s.id) })
      .groupBy('p.salida_id')
      .getRawMany();
    const mapa = new Map(filas.map((f) => [Number(f.salida_id), Number(f.n)]));
    return salidas.map((s) => ({ ...s, ocupados: mapa.get(s.id) ?? 0 }));
  }

  async list(f: {
    fecha?: string;
    estado?: EstadoSalida;
    rutaId?: number;
    oficina?: string;
  }) {
    const where: any = {};
    if (f.estado) where.estado = f.estado;
    if (f.rutaId) where.rutaId = f.rutaId;
    if (f.fecha) {
      const ini = new Date(`${f.fecha}T00:00:00`);
      const fin = new Date(`${f.fecha}T23:59:59.999`);
      where.fechaHoraProgramada = Between(ini, fin);
    }
    if (f.oficina) where.ruta = { origen: f.oficina };
    const salidas = await this.repo.find({
      where,
      relations: REL,
      order: { fechaHoraProgramada: 'ASC' },
      take: 300,
    });
    return this.conOcupacion(salidas);
  }

  /** Cola virtual de turnos: salidas programadas desde hoy, por orden de hora. */
  async cola(oficina?: string) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const where: any = {
      estado: EstadoSalida.Programado,
      fechaHoraProgramada: MoreThanOrEqual(hoy),
    };
    if (oficina) where.ruta = { origen: oficina };
    const salidas = await this.repo.find({
      where,
      relations: REL,
      order: { fechaHoraProgramada: 'ASC' },
      take: 100,
    });
    return (await this.conOcupacion(salidas)).map((s, i) => ({
      ...s,
      posicion: i + 1,
    }));
  }

  async findOne(id: number) {
    const s = await this.repo.findOne({ where: { id }, relations: REL });
    if (!s) throw new NotFoundException('Salida no encontrada');
    return s;
  }

  /** Mapa de asientos: capacidad del turno y asientos ocupados. */
  async asientos(id: number) {
    const salida = await this.findOne(id);
    const ocupados = await this.pasajeros.find({
      where: { salidaId: id },
      order: { numeroAsiento: 'ASC' },
    });
    return {
      salida,
      capacidad: salida.capacidadMaximaTurno,
      permiteSobrecupo: salida.camioneta!.permiteSobrecupo,
      tarifaBase: salida.ruta!.tarifaBase,
      paradas: salida.ruta!.paradas,
      ocupados: ocupados.map((p) => ({
        numero: p.numeroAsiento,
        pasajeroId: p.id,
        nombre: p.nombrePasajero,
        documento: p.documentoIdentidad,
      })),
    };
  }

  private async validarRecursos(
    camionetaId: number,
    rutaId: number,
    fecha: Date,
    ignorarId?: number,
  ) {
    const camioneta = await this.camionetas.findOne({
      where: { id: camionetaId },
    });
    if (!camioneta || !camioneta.activa)
      throw new BadRequestException('Camioneta inválida o inactiva');
    const ruta = await this.rutas.findOne({ where: { id: rutaId } });
    if (!ruta || !ruta.activa)
      throw new BadRequestException('Ruta inválida o inactiva');

    // La misma camioneta no puede tener dos turnos activos con menos de 1 hora de diferencia
    const desde = new Date(fecha.getTime() - 60 * 60_000);
    const hasta = new Date(fecha.getTime() + 60 * 60_000);
    const choque = await this.repo.find({
      where: {
        camionetaId,
        estado: In([EstadoSalida.Programado, EstadoSalida.EnTrayecto]),
        fechaHoraProgramada: Between(desde, hasta),
      },
    });
    if (choque.some((s) => s.id !== ignorarId)) {
      throw new ConflictException(
        'La camioneta ya tiene un turno activo en ese horario',
      );
    }
    return camioneta;
  }

  async create(dto: CreateSalidaDto, user: AuthUser) {
    const fecha = new Date(dto.fechaHoraProgramada);
    const camioneta = await this.validarRecursos(
      dto.camionetaId,
      dto.rutaId,
      fecha,
    );
    if (dto.habilitarSobrecupo && !camioneta.permiteSobrecupo) {
      throw new BadRequestException(
        'Esta camioneta no permite el asiento 8 (sobrecupo)',
      );
    }
    const s = await this.repo.save(
      this.repo.create({
        camionetaId: dto.camionetaId,
        rutaId: dto.rutaId,
        fechaHoraProgramada: fecha,
        capacidadMaximaTurno: dto.habilitarSobrecupo
          ? 8
          : camioneta.capacidadEstandar,
        createdBy: user.id,
        updatedBy: user.id,
      }),
    );
    this.events.emit('salida:asientos', { salidaId: s.id });
    return this.findOne(s.id);
  }

  async update(id: number, dto: UpdateSalidaDto, user: AuthUser) {
    const s = await this.findOne(id);
    if (s.estado !== EstadoSalida.Programado)
      throw new ConflictException('Solo se puede editar una salida programada');

    const camionetaId = dto.camionetaId ?? s.camionetaId;
    const rutaId = dto.rutaId ?? s.rutaId;
    const fecha = dto.fechaHoraProgramada
      ? new Date(dto.fechaHoraProgramada)
      : s.fechaHoraProgramada;
    const camioneta = await this.validarRecursos(
      camionetaId,
      rutaId,
      fecha,
      id,
    );

    let capacidad = s.capacidadMaximaTurno;
    if (dto.habilitarSobrecupo !== undefined || dto.camionetaId) {
      const quiere8 = dto.habilitarSobrecupo ?? capacidad === 8;
      if (quiere8 && !camioneta.permiteSobrecupo) {
        throw new BadRequestException(
          'Esta camioneta no permite el asiento 8 (sobrecupo)',
        );
      }
      capacidad = quiere8 ? 8 : camioneta.capacidadEstandar;
    }
    if (capacidad < s.capacidadMaximaTurno) {
      const conAsientoAlto = await this.pasajeros.exists({
        where: { salidaId: id, numeroAsiento: MoreThanOrEqual(capacidad + 1) },
      });
      if (conAsientoAlto)
        throw new ConflictException(
          'El asiento 8 está vendido; anule o reubique ese pasaje primero',
        );
    }

    await this.repo.update(id, {
      camionetaId,
      rutaId,
      fechaHoraProgramada: fecha,
      capacidadMaximaTurno: capacidad,
      updatedBy: user.id,
    });
    this.events.emit('salida:asientos', { salidaId: id });
    return this.findOne(id);
  }

  async cambiarEstado(id: number, estado: EstadoSalida, user: AuthUser) {
    const s = await this.findOne(id);
    if (!TRANSICIONES[s.estado].includes(estado)) {
      throw new ConflictException(
        `No se puede pasar de "${s.estado}" a "${estado}"`,
      );
    }
    if (
      estado === EstadoSalida.Cancelado &&
      (await this.pasajeros.exists({ where: { salidaId: id } }))
    ) {
      throw new ConflictException(
        'Hay pasajes vendidos; anúlelos antes de cancelar el turno',
      );
    }
    await this.repo.update(id, { estado, updatedBy: user.id });
    await this.encomiendas.avanzarPorSalida(id, estado, user.id);
    this.events.emit('salida:asientos', { salidaId: id });
    return this.findOne(id);
  }

  // ------------------------- manifiesto -------------------------

  async manifiestoPdf(id: number) {
    return this.manifiesto.generarPdf(await this.findOne(id));
  }

  async manifiestoWhatsapp(id: number) {
    const s = await this.findOne(id);
    const tel = s.camioneta!.choferTelefono;
    if (!tel)
      throw new BadRequestException(
        'El conductor no tiene teléfono registrado',
      );
    const { pasajeros, encomiendas } = await this.manifiesto.datos(s);
    const n = await this.notificaciones.encolar(
      TipoNotificacion.Manifiesto,
      tel,
      Mensajes.manifiesto({
        fecha: s.fechaHoraProgramada.toLocaleString('es-BO'),
        ruta: `${s.ruta!.origen} → ${s.ruta!.destino}`,
        placa: s.camioneta!.placa,
        pasajeros: pasajeros.map(
          (p) =>
            `${p.numeroAsiento}. ${p.nombrePasajero} (${p.documentoIdentidad})`,
        ),
        encomiendas: encomiendas.length,
      }),
      { tipo: 'salida', id },
    );
    return { ok: true, notificacionId: n?.id ?? null };
  }
}
