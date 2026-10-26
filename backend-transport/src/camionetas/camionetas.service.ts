import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/interfaces/auth-user';
import { Camioneta } from './entities/camioneta.entity';
import { CreateCamionetaDto, UpdateCamionetaDto } from './dto/camionetas.dto';

@Injectable()
export class CamionetasService {
  constructor(
    @InjectRepository(Camioneta) private readonly repo: Repository<Camioneta>,
  ) {}

  findAll(soloActivas = false) {
    return this.repo.find({
      where: soloActivas ? { activa: true } : {},
      order: { placa: 'ASC' },
    });
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Camioneta no encontrada');
    return c;
  }

  async create(dto: CreateCamionetaDto, user: AuthUser) {
    const placa = dto.placa.trim().toUpperCase();
    if (await this.repo.exists({ where: { placa } }))
      throw new ConflictException('La placa ya está registrada');
    return this.repo.save(
      this.repo.create({
        ...dto,
        placa,
        choferTelefono: dto.choferTelefono ?? null,
        permiteSobrecupo: dto.permiteSobrecupo ?? false,
        capacidadEstandar: 7,
        createdBy: user.id,
        updatedBy: user.id,
      }),
    );
  }

  async update(id: number, dto: UpdateCamionetaDto, user: AuthUser) {
    const c = await this.findOne(id);
    if (dto.placa) {
      dto.placa = dto.placa.trim().toUpperCase();
      const otra = await this.repo.findOne({ where: { placa: dto.placa } });
      if (otra && otra.id !== id)
        throw new ConflictException('La placa ya está registrada');
    }
    Object.assign(c, dto, { updatedBy: user.id });
    return this.repo.save(c);
  }
}
