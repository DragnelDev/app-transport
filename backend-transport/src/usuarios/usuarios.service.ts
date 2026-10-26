import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/interfaces/auth-user';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuarios.dto';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
  ) {}

  toAuthUser(u: Usuario): AuthUser {
    return {
      id: u.id,
      usuario: u.usuario,
      nombreCompleto: u.nombreCompleto,
      rol: u.rol,
      oficinaSucursal: u.oficinaSucursal,
    };
  }

  async findActivo(id: number): Promise<AuthUser | null> {
    const u = await this.repo.findOne({ where: { id, activo: true } });
    return u ? this.toAuthUser(u) : null;
  }

  /** Incluye password_hash (select:false) para validar credenciales. */
  findByUsuarioConPassword(usuario: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.usuario = :usuario', { usuario })
      .getOne();
  }

  findAll() {
    return this.repo.find({ order: { nombreCompleto: 'ASC' } });
  }

  async create(dto: CreateUsuarioDto) {
    if (await this.repo.exists({ where: { usuario: dto.usuario } })) {
      throw new ConflictException('El nombre de usuario ya existe');
    }
    const u = this.repo.create({
      nombreCompleto: dto.nombreCompleto,
      usuario: dto.usuario,
      rol: dto.rol,
      oficinaSucursal: dto.oficinaSucursal,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });
    return this.repo.save(u);
  }

  async update(id: number, dto: UpdateUsuarioDto, actor: AuthUser) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    if (
      id === actor.id &&
      (dto.activo === false || (dto.rol && dto.rol !== u.rol))
    ) {
      throw new ConflictException(
        'No puede desactivarse ni cambiar su propio rol',
      );
    }
    const { password, ...resto } = dto;
    Object.assign(u, resto);
    if (password) u.passwordHash = await bcrypt.hash(password, 10);
    return this.repo.save(u);
  }

  async cambiarPassword(id: number, nueva: string) {
    await this.repo.update(id, { passwordHash: await bcrypt.hash(nueva, 10) });
  }
}
