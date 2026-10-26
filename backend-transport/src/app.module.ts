import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CajaModule } from './caja/caja.module';
import { CamionetasModule } from './camionetas/camionetas.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { EncomiendasModule } from './encomiendas/encomiendas.module';
import { EventsModule } from './events/events.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { PagosQrModule } from './pagos-qr/pagos-qr.module';
import { PasajerosModule } from './pasajeros/pasajeros.module';
import { RutasModule } from './rutas/rutas.module';
import { SalidasModule } from './salidas/salidas.module';
import { SeedService } from './seed/seed.service';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        host: cfg.get<string>('DB_HOST') ?? 'localhost',
        port: Number(cfg.get('DB_PORT') ?? 5432),
        username: cfg.get<string>('DB_USERNAME') ?? 'transport',
        password: cfg.get<string>('DB_PASSWORD') ?? 'transport',
        database: cfg.get<string>('DB_NAME') ?? 'transport',
        autoLoadEntities: true,
        // En producción use migraciones y DB_SYNCHRONIZE=false
        synchronize: (cfg.get('DB_SYNCHRONIZE') ?? 'true') === 'true',
      }),
    }),
    UsuariosModule,
    AuthModule,
    EventsModule,
    NotificacionesModule,
    RutasModule,
    CamionetasModule,
    PagosQrModule,
    PasajerosModule,
    EncomiendasModule,
    SalidasModule,
    CajaModule,
    DashboardModule,
  ],
  providers: [
    SeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
