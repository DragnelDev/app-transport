import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CierreCaja } from '../caja/cierre-caja.entity';
import { AuditEntity } from '../common/entities/audit.entity';
import { EstadoEntrega, MetodoPago, TipoPagoEncomienda } from '../common/enums';
import { decimalTransformer } from '../common/utils/decimal.transformer';
import { PagoQr } from '../pagos-qr/pago-qr.entity';
import { Salida } from '../salidas/salida.entity';

@Entity('encomiendas')
export class Encomienda extends AuditEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Código único de la guía (ej. ENC-2026-1042). Se imprime como QR en la etiqueta. */
  @Column({ name: 'codigo_guia', length: 20, unique: true })
  codigoGuia: string;

  @Column({ name: 'salida_id', type: 'int', nullable: true })
  salidaId: number | null;

  @ManyToOne(() => Salida, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'salida_id' })
  salida?: Salida | null;

  @Column({ name: 'remitente_nombre', length: 100 })
  remitenteNombre: string;

  @Column({ name: 'remitente_ci', type: 'varchar', length: 30, nullable: true })
  remitenteCi: string | null;

  @Column({ name: 'remitente_telefono', length: 20 })
  remitenteTelefono: string;

  @Column({ name: 'destinatario_nombre', length: 100 })
  destinatarioNombre: string;

  @Index()
  @Column({ name: 'destinatario_ci', type: 'varchar', length: 30, nullable: true })
  destinatarioCi: string | null;

  @Index()
  @Column({ name: 'destinatario_telefono', length: 20 })
  destinatarioTelefono: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'cantidad_bultos', type: 'int', default: 1 })
  cantidadBultos: number;

  @Column({ name: 'peso_estimado', type: 'numeric', precision: 8, scale: 2, nullable: true, transformer: decimalTransformer })
  pesoEstimado: number | null;

  @Column({ name: 'tipo_empaque', type: 'varchar', length: 50, nullable: true })
  tipoEmpaque: string | null;

  @Column({ name: 'oficina_origen', type: 'varchar', length: 100, nullable: true })
  oficinaOrigen: string | null;

  @Column({ name: 'oficina_destino', type: 'varchar', length: 100, nullable: true })
  oficinaDestino: string | null;

  @Column({ name: 'monto_cobrado', type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
  montoCobrado: number;

  @Column({ name: 'tipo_pago', type: 'enum', enum: TipoPagoEncomienda })
  tipoPago: TipoPagoEncomienda;

  /** Se define al cobrar (en origen, o en destino si es contra entrega). */
  @Column({ name: 'metodo_pago', type: 'enum', enum: MetodoPago, nullable: true })
  metodoPago: MetodoPago | null;

  @Column({ name: 'pago_qr_id', type: 'int', nullable: true })
  pagoQrId: number | null;

  @ManyToOne(() => PagoQr, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pago_qr_id' })
  pagoQr?: PagoQr | null;

  @Column({ default: false })
  pagado: boolean;

  @Column({ name: 'pagado_at', type: 'timestamptz', nullable: true })
  pagadoAt: Date | null;

  /** Secretaria que realizó el cobro (origen o destino); define su cierre de caja. */
  @Index()
  @Column({ name: 'pagado_by', type: 'int', nullable: true })
  pagadoBy: number | null;

  @Index()
  @Column({ name: 'cierre_caja_id', type: 'int', nullable: true })
  cierreCajaId: number | null;

  @ManyToOne(() => CierreCaja, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cierre_caja_id' })
  cierreCaja?: CierreCaja | null;

  @Column({ name: 'estado_entrega', type: 'enum', enum: EstadoEntrega, default: EstadoEntrega.EnOrigen })
  estadoEntrega: EstadoEntrega;

  @Column({ name: 'entregado_at', type: 'timestamptz', nullable: true })
  entregadoAt: Date | null;

  @Column({ name: 'recibido_por_nombre', type: 'varchar', length: 100, nullable: true })
  recibidoPorNombre: string | null;

  @Column({ name: 'recibido_por_ci', type: 'varchar', length: 30, nullable: true })
  recibidoPorCi: string | null;
}
