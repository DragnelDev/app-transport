import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Ruta } from 'src/rutas/entities/ruta.entity';
import { Camioneta } from 'src/camionetas/entities/camioneta.entity';

/** Crea el administrador inicial (y datos de ejemplo opcionales) si la BD está vacía. */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly cfg: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const usuarios = this.ds.getRepository(Usuario);
    if ((await usuarios.count()) === 0) {
      const user =
        this.cfg.get('SEED_ADMIN_USER') ??
        this.cfg.get('ADMIN_USERNAME') ??
        'admin';
      const pass =
        this.cfg.get('SEED_ADMIN_PASSWORD') ??
        this.cfg.get('ADMIN_PASSWORD') ??
        'Admin123!';
      const admin = await usuarios.save(
        usuarios.create({
          nombreCompleto: 'Administrador General',
          usuario: user,
          passwordHash: await bcrypt.hash(pass, 10),
          rol: 'Administrador',
          oficinaSucursal: this.cfg.get('SEED_OFFICE') ?? 'Oficina Provincia A',
        }),
      );
      this.logger.warn(
        `Usuario administrador creado: "${user}". ¡Cambie la contraseña tras el primer ingreso!`,
      );

      if (this.cfg.get('SEED_DEMO_DATA') === 'true') {
        await usuarios.save(
          usuarios.create({
            nombreCompleto: 'Secretaria Demo',
            usuario: 'secretaria',
            passwordHash: await bcrypt.hash('Secre123!', 10),
            rol: 'Secretaria',
            oficinaSucursal: 'Oficina Provincia A',
          }),
        );
        await this.ds.getRepository(Ruta).save([
          {
            origen: 'Oficina Provincia A',
            destino: 'Oficina Terminal B',
            tarifaBase: 35,
            paradas: ['Peaje', 'Plaza Central'],
            createdBy: admin.id,
            updatedBy: admin.id,
          },
          {
            origen: 'Oficina Terminal B',
            destino: 'Oficina Provincia A',
            tarifaBase: 35,
            paradas: ['Plaza Central', 'Peaje'],
            createdBy: admin.id,
            updatedBy: admin.id,
          },
        ]);
        await this.ds.getRepository(Camioneta).save([
          {
            placa: '1234-ABC',
            marcaModelo: 'Toyota HiAce',
            permiteSobrecupo: true,
            choferNombre: 'Juan Pérez',
            choferTelefono: '71234567',
            createdBy: admin.id,
            updatedBy: admin.id,
          },
          {
            placa: '5678-XYZ',
            marcaModelo: 'Toyota HiAce',
            permiteSobrecupo: false,
            choferNombre: 'Carlos Rojas',
            choferTelefono: '76543210',
            createdBy: admin.id,
            updatedBy: admin.id,
          },
        ]);
        this.logger.log(
          'Datos de demostración creados (usuario "secretaria").',
        );
      }
    }
  }
}
