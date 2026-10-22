import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TipoNotificacion } from '../common/enums';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoNotificacion })
  tipo: TipoNotificacion;

  @Column({ length: 30 })
  telefono: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ type: 'enum', enum: ['Pendiente', 'Enviado', 'Fallido'], default: 'Pendiente' })
  estado: 'Pendiente' | 'Enviado' | 'Fallido';

  @Column({ type: 'int', default: 0 })
  intentos: number;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'referencia_tipo', type: 'varchar', length: 30, nullable: true })
  referenciaTipo: string | null;

  @Column({ name: 'referencia_id', type: 'int', nullable: true })
  referenciaId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;
}
