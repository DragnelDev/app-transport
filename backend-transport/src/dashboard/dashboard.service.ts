import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, In, Not } from 'typeorm';
import { EstadoEntrega, EstadoSalida } from '../common/enums';
import { Encomienda } from '../encomiendas/encomienda.entity';
import { Pasajero } from '../pasajeros/pasajero.entity';
import { Salida } from '../salidas/salida.entity';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async resumen() {
    const ini = new Date(); ini.setHours(0, 0, 0, 0);
    const fin = new Date(); fin.setHours(23, 59, 59, 999);
    const hoy = Between(ini, fin);

    const [salidasHoy, programadas, enTrayecto, pasajesHoy, encEnTransito, encListas, encPendientesCobro, ingresos] =
      await Promise.all([
        this.ds.getRepository(Salida).count({ where: { fechaHoraProgramada: hoy, estado: Not(EstadoSalida.Cancelado) } }),
        this.ds.getRepository(Salida).count({ where: { fechaHoraProgramada: hoy, estado: EstadoSalida.Programado } }),
        this.ds.getRepository(Salida).count({ where: { estado: EstadoSalida.EnTrayecto } }),
        this.ds.getRepository(Pasajero).count({ where: { createdAt: hoy } }),
        this.ds.getRepository(Encomienda).count({ where: { estadoEntrega: In([EstadoEntrega.EnOrigen, EstadoEntrega.EnViaje]) } }),
        this.ds.getRepository(Encomienda).count({ where: { estadoEntrega: EstadoEntrega.ListoDestino } }),
        this.ds.getRepository(Encomienda).count({ where: { pagado: false, estadoEntrega: Not(EstadoEntrega.Entregado) } }),
        this.ds.query(
          `SELECT metodo, COALESCE(SUM(monto),0)::float AS total FROM (
             SELECT metodo_pago::text AS metodo, monto_pago AS monto FROM pasajeros
               WHERE deleted_at IS NULL AND created_at BETWEEN $1 AND $2
             UNION ALL
             SELECT metodo_pago::text, monto_cobrado FROM encomiendas
               WHERE pagado = true AND pagado_at BETWEEN $1 AND $2
           ) t GROUP BY metodo`,
          [ini, fin],
        ),
      ]);

    const total = (m: string) => ingresos.find((i: any) => i.metodo === m)?.total ?? 0;
    return {
      salidasHoy, programadas, enTrayecto, pasajesHoy,
      encomiendas: { enTransito: encEnTransito, listasParaRetiro: encListas, pendientesDeCobro: encPendientesCobro },
      ingresosHoy: { efectivo: total('Efectivo'), qr: total('QR') },
    };
  }
}
