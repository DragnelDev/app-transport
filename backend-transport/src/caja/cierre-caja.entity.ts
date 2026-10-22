import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../common/utils/decimal.transformer';
import { Usuario } from '../usuarios/usuario.entity';

const num = { type: 'numeric' as const, precision: 12, scale: 2, default: 0, transformer: decimalTransformer };

@Entity('cierres_caja')
export class CierreCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_id', type: 'int' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ name: 'oficina_sucursal', length: 100 })
  oficinaSucursal: string;

  /** Inicio del periodo cubierto (primera transacción incluida). */
  @Column({ name: 'periodo_desde', type: 'timestamptz', nullable: true })
  periodoDesde: Date | null;

  @CreateDateColumn({ name: 'fecha_cierre', type: 'timestamptz' })
  fechaCierre: Date;

  @Column(num) efectivoPasajes: number;
  @Column(num) efectivoEncomiendas: number;
  @Column(num) qrPasajes: number;
  @Column(num) qrEncomiendas: number;
  @Column({ name: 'total_efectivo', ...num }) totalEfectivo: number;
  @Column({ name: 'total_qr', ...num }) totalQr: number;
  @Column({ name: 'total_general', ...num }) totalGeneral: number;

  @Column({ name: 'cantidad_pasajes', type: 'int', default: 0 }) cantidadPasajes: number;
  @Column({ name: 'cantidad_encomiendas', type: 'int', default: 0 }) cantidadEncomiendas: number;

  /** Efectivo físico contado por la secretaria (opcional). */
  @Column({ name: 'efectivo_contado', type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  efectivoContado: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  diferencia: number | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  /** Desglose congelado (por salida, encomiendas, etc.). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  detalle: Record<string, any>;
}
