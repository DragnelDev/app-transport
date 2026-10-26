import { AuditEntity } from 'src/common/entities/audit.entity';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('camionetas')
export class Camioneta extends AuditEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  placa: string;

  @Column({ name: 'marca_modelo', length: 50 })
  marcaModelo: string;

  @Column({ name: 'capacidad_estandar', type: 'int', default: 7 })
  capacidadEstandar: number;

  /** TRUE si la unidad permite el asiento 8 (central delantero). */
  @Column({ name: 'permite_sobrecupo', default: false })
  permiteSobrecupo: boolean;

  @Column({ name: 'chofer_nombre', length: 100 })
  choferNombre: string;

  @Column({
    name: 'chofer_telefono',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  choferTelefono: string | null;

  @Column({ default: true })
  activa: boolean;
}
