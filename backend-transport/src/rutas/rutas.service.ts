import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/interfaces/auth-user';
import { CreateRutaDto, UpdateRutaDto } from './dto/rutas.dto';
import { Ruta } from './entities/ruta.entity';

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(Ruta) private readonly repo: Repository<Ruta>,
  ) {}

  findAll(soloActivas = false) {
    return this.repo.find({
      where: soloActivas ? { activa: true } : {},
      order: { origen: 'ASC', destino: 'ASC' },
    });
  }

  async findOne(id: number) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Ruta no encontrada');
    return r;
  }

  create(dto: CreateRutaDto, user: AuthUser) {
    return this.repo.save(
      this.repo.create({
        ...dto,
        paradas: dto.paradas ?? [],
        createdBy: user.id,
        updatedBy: user.id,
      }),
    );
  }

  async update(id: number, dto: UpdateRutaDto, user: AuthUser) {
    const r = await this.findOne(id);
    Object.assign(r, dto, { updatedBy: user.id });
    return this.repo.save(r);
  }
}
