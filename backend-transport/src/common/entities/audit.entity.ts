import {
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

/** Campos de auditoría comunes (created_at/by, updated_at/by). */
export abstract class AuditEntity {
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creador?: Usuario | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  modificador?: Usuario | null;
}
