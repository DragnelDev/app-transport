import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre_completo', length: 100 })
  nombreCompleto: string;

  @Column({ length: 50, unique: true })
  usuario: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: ['Secretaria', 'Administrador'],
    default: 'Secretaria',
  })
  rol: 'Secretaria' | 'Administrador';

  @Column({ name: 'oficina_sucursal', length: 100 })
  oficinaSucursal: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
