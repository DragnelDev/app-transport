import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditEntity } from '../common/entities/audit.entity';
import { decimalTransformer } from '../common/utils/decimal.transformer';

@Entity('rutas')
export class Ruta extends AuditEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  origen: string;

  @Column({ length: 100 })
  destino: string;

  @Column({ name: 'tarifa_base', type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
  tarifaBase: number;

  /** Paradas / puntos de bajada intermedios */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  paradas: string[];

  @Column({ default: true })
  activa: boolean;
}
