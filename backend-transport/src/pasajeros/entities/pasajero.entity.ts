import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Salida } from 'src/salidas/entities/salida.entity';
import { AuditEntity } from 'src/common/entities/audit.entity';
import { decimalTransformer } from 'src/common/utils/decimal.transformer';
import { MetodoPago } from 'src/common/enums';
import { PagoQr } from 'src/pagos-qr/entities/pago-qr.entity';
import { CierreCaja } from 'src/caja/entities/cierre-caja.entity';

/**
 * El índice único parcial es la última barrera contra el overbooking:
 * un mismo asiento no puede estar activo dos veces en la misma salida.
 */
@Entity('pasajeros')
@Index('uq_pasajeros_salida_asiento_activo', ['salidaId', 'numeroAsiento'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Pasajero extends AuditEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'salida_id', type: 'int' })
  salidaId: number;

  @ManyToOne(() => Salida, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'salida_id' })
  salida?: Salida;

  /** 1-7 estándar, 8 = asiento medio delantero (sobrecupo). */
  @Column({ name: 'numero_asiento', type: 'int' })
  numeroAsiento: number;

  @Column({ name: 'nombre_pasajero', length: 100 })
  nombrePasajero: string;

  @Column({ name: 'documento_identidad', length: 30 })
  documentoIdentidad: string;

  @Column({ length: 20 })
  telefono: string;

  @Column({
    name: 'parada_destino',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  paradaDestino: string | null;

  @Column({
    name: 'monto_pago',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  montoPago: number;

  @Column({ name: 'metodo_pago', type: 'enum', enum: MetodoPago })
  metodoPago: MetodoPago;

  @Column({ name: 'pago_qr_id', type: 'int', nullable: true })
  pagoQrId: number | null;

  @ManyToOne(() => PagoQr, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pago_qr_id' })
  pagoQr?: PagoQr | null;

  @Index()
  @Column({ name: 'cierre_caja_id', type: 'int', nullable: true })
  cierreCajaId: number | null;

  @ManyToOne(() => CierreCaja, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cierre_caja_id' })
  cierreCaja?: CierreCaja | null;

  @Column({
    name: 'motivo_anulacion',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  motivoAnulacion: string | null;

  /** Soft delete: boleto anulado (se conserva para auditoría). */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;
}
