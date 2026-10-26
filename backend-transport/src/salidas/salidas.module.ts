import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManifiestoService } from './manifiesto.service';
import { Salida } from './entities/salida.entity';
import { SalidasController } from './salidas.controller';
import { SalidasService } from './salidas.service';
import { Pasajero } from 'src/pasajeros/entities/pasajero.entity';
import { Encomienda } from 'src/encomiendas/entities/encomienda.entity';
import { Camioneta } from 'src/camionetas/entities/camioneta.entity';
import { Ruta } from 'src/rutas/entities/ruta.entity';
import { EncomiendasModule } from 'src/encomiendas/encomiendas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Salida, Pasajero, Encomienda, Camioneta, Ruta]),
    EncomiendasModule,
  ],
  controllers: [SalidasController],
  providers: [SalidasService, ManifiestoService],
  exports: [SalidasService],
})
export class SalidasModule {}
