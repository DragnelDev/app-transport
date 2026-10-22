import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { EstadoSalida, MetodoPago } from '../common/enums';
import { AuthUser } from '../common/interfaces/auth-user';
import { Encomienda } from '../encomiendas/encomienda.entity';
import { Pasajero } from '../pasajeros/pasajero.entity';
import { CierreCaja } from './cierre-caja.entity';

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(CierreCaja) private readonly repo: Repository<CierreCaja>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  private resolverUsuario(actor: AuthUser, usuarioId?: number) {
    if (usuarioId && usuarioId !== actor.id) {
      if (actor.rol !== 'Administrador') throw new ForbiddenException('Solo puede ver su propia caja');
      return usuarioId;
    }
    return actor.id;
  }

  /** Calcula (sin congelar) lo cobrado por la secretaria desde su último cierre. */
  private async calcular(em: EntityManager, usuarioId: number) {
    const pasajes = await em.find(Pasajero, {
      where: { createdBy: usuarioId, cierreCajaId: IsNull() },
      relations: { salida: { ruta: true, camioneta: true } },
      order: { id: 'ASC' },
    });
    const encomiendas = await em.find(Encomienda, {
      where: { pagado: true, pagadoBy: usuarioId, cierreCajaId: IsNull() },
      order: { id: 'ASC' },
    });

    const sum = (xs: { monto: number }[]) => r2(xs.reduce((a, x) => a + x.monto, 0));
    const pa = pasajes.map((p) => ({ monto: p.montoPago, metodo: p.metodoPago }));
    const en = encomiendas.map((e) => ({ monto: e.montoCobrado, metodo: e.metodoPago }));

    const efectivoPasajes = sum(pa.filter((x) => x.metodo === MetodoPago.Efectivo));
    const qrPasajes = sum(pa.filter((x) => x.metodo === MetodoPago.QR));
    const efectivoEncomiendas = sum(en.filter((x) => x.metodo === MetodoPago.Efectivo));
    const qrEncomiendas = sum(en.filter((x) => x.metodo === MetodoPago.QR));

    // Desglose por salida (con marca de sobrecupo)
    const porSalida = new Map<number, any>();
    for (const p of pasajes) {
      const s = p.salida!;
      const d =
        porSalida.get(s.id) ??
        {
          salidaId: s.id,
          ruta: `${s.ruta!.origen} → ${s.ruta!.destino}`,
          fecha: s.fechaHoraProgramada,
          placa: s.camioneta!.placa,
          estado: s.estado,
          ejecutada: s.estado === EstadoSalida.EnTrayecto || s.estado === EstadoSalida.Finalizado,
          sobrecupo: s.capacidadMaximaTurno === 8,
          pasajes: 0,
          usoAsiento8: false,
          efectivo: 0,
          qr: 0,
        };
      d.pasajes += 1;
      if (p.numeroAsiento === 8) d.usoAsiento8 = true;
      if (p.metodoPago === MetodoPago.Efectivo) d.efectivo = r2(d.efectivo + p.montoPago);
      else d.qr = r2(d.qr + p.montoPago);
      porSalida.set(s.id, d);
    }
    const salidas = [...porSalida.values()].sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha));

    const totalEfectivo = r2(efectivoPasajes + efectivoEncomiendas);
    const totalQr = r2(qrPasajes + qrEncomiendas);
    const periodoDesde = [...pasajes.map((p) => p.createdAt), ...encomiendas.map((e) => e.pagadoAt!)]
      .filter(Boolean)
      .sort((a, b) => +a - +b)[0] ?? null;

    return {
      pasajes,
      encomiendas,
      resumen: {
        periodoDesde,
        efectivoPasajes, efectivoEncomiendas, qrPasajes, qrEncomiendas,
        totalEfectivo, totalQr, totalGeneral: r2(totalEfectivo + totalQr),
        cantidadPasajes: pasajes.length,
        cantidadEncomiendas: encomiendas.length,
        salidasConSobrecupo: salidas.filter((s) => s.sobrecupo).length,
        salidas,
        encomiendasDetalle: encomiendas.map((e) => ({
          id: e.id, codigoGuia: e.codigoGuia, monto: e.montoCobrado, metodo: e.metodoPago,
          tipoPago: e.tipoPago, pagadoAt: e.pagadoAt,
        })),
      },
    };
  }

  async resumen(actor: AuthUser, usuarioId?: number) {
    const uid = this.resolverUsuario(actor, usuarioId);
    const { resumen } = await this.calcular(this.ds.manager, uid);
    return { usuarioId: uid, ...resumen };
  }

  /** Cierra la caja y congela las transacciones incluidas. */
  async cerrar(actor: AuthUser, efectivoContado?: number, observaciones?: string) {
    return this.ds.transaction(async (em) => {
      const { pasajes, encomiendas, resumen } = await this.calcular(em, actor.id);
      if (!pasajes.length && !encomiendas.length) {
        throw new BadRequestException('No hay transacciones pendientes de cierre');
      }
      const { periodoDesde, salidas, encomiendasDetalle, ...totales } = resumen;
      const cierre = await em.save(
        em.create(CierreCaja, {
          usuarioId: actor.id,
          oficinaSucursal: actor.oficinaSucursal,
          periodoDesde,
          efectivoPasajes: totales.efectivoPasajes,
          efectivoEncomiendas: totales.efectivoEncomiendas,
          qrPasajes: totales.qrPasajes,
          qrEncomiendas: totales.qrEncomiendas,
          totalEfectivo: totales.totalEfectivo,
          totalQr: totales.totalQr,
          totalGeneral: totales.totalGeneral,
          cantidadPasajes: totales.cantidadPasajes,
          cantidadEncomiendas: totales.cantidadEncomiendas,
          efectivoContado: efectivoContado ?? null,
          diferencia: efectivoContado === undefined ? null : r2(efectivoContado - totales.totalEfectivo),
          observaciones: observaciones ?? null,
          detalle: { salidas, encomiendas: encomiendasDetalle, salidasConSobrecupo: totales.salidasConSobrecupo },
        }),
      );
      // Congelamiento: estas filas ya no pueden modificarse ni anularse
      if (pasajes.length) await em.update(Pasajero, pasajes.map((p) => p.id), { cierreCajaId: cierre.id });
      if (encomiendas.length) await em.update(Encomienda, encomiendas.map((e) => e.id), { cierreCajaId: cierre.id });
      return cierre;
    });
  }

  historial(actor: AuthUser, usuarioId?: number) {
    const where = actor.rol === 'Administrador' ? (usuarioId ? { usuarioId } : {}) : { usuarioId: actor.id };
    return this.repo.find({ where, relations: { usuario: true }, order: { id: 'DESC' }, take: 100 });
  }

  async findOne(id: number, actor: AuthUser) {
    const c = await this.repo.findOne({ where: { id }, relations: { usuario: true } });
    if (!c) throw new NotFoundException('Cierre no encontrado');
    if (actor.rol !== 'Administrador' && c.usuarioId !== actor.id) throw new ForbiddenException();
    return c;
  }
}
