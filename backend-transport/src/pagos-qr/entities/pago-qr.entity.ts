import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoPagoQr } from '../../common/enums';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('pagos_qr')
export class PagoQr {
  @PrimaryGeneratedColumn()
  id: number;

  /** Referencia interna única enviada a la pasarela. */
  @Column({ length: 60, unique: true })
  referencia: string;

  @Column({
    name: 'transaccion_id_banco',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transaccionIdBanco: string | null;

  @Column({ name: 'imagen_qr_base64', type: 'text' })
  imagenQrBase64: string;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  monto: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  glosa: string | null;

  @Column({ type: 'enum', enum: EstadoPagoQr, default: EstadoPagoQr.Pendiente })
  estado: EstadoPagoQr;

  @Column({
    name: 'fecha_generacion',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaGeneracion: Date;

  @Column({ name: 'fecha_expiracion', type: 'timestamptz' })
  fechaExpiracion: Date;

  @Column({ name: 'fecha_confirmacion', type: 'timestamptz', nullable: true })
  fechaConfirmacion: Date | null;

  /** TRUE cuando ya respaldó un pasaje o una encomienda (evita reutilizarlo). */
  @Column({ default: false })
  utilizado: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creador?: Usuario | null;
}
