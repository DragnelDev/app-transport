import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditEntity } from '../../common/entities/audit.entity';
import { Camioneta } from 'src/camionetas/entities/camioneta.entity';
import { Ruta } from 'src/rutas/entities/ruta.entity';
import { EstadoSalida } from 'src/common/enums';
@Entity('salidas')
export class Salida extends AuditEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'camioneta_id', type: 'int' })
  camionetaId: number;

  @ManyToOne(() => Camioneta, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'camioneta_id' })
  camioneta?: Camioneta;

  @Column({ name: 'ruta_id', type: 'int' })
  rutaId: number;

  @ManyToOne(() => Ruta, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ruta_id' })
  ruta?: Ruta;

  @Column({ name: 'fecha_hora_programada', type: 'timestamptz' })
  fechaHoraProgramada: Date;

  /** 7 por defecto, 8 si se habilita el sobrecupo (asiento central delantero). */
  @Column({ name: 'capacidad_maxima_turno', type: 'int', default: 7 })
  capacidadMaximaTurno: number;

  @Column({
    type: 'enum',
    enum: EstadoSalida,
    default: EstadoSalida.Programado,
  })
  estado: EstadoSalida;
}
