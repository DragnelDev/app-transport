import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Camioneta } from '../camionetas/camioneta.entity';
import { Encomienda } from '../encomiendas/encomienda.entity';
import { EncomiendasModule } from '../encomiendas/encomiendas.module';
import { Pasajero } from '../pasajeros/pasajero.entity';
import { Ruta } from '../rutas/ruta.entity';
import { ManifiestoService } from './manifiesto.service';
import { Salida } from './salida.entity';
import { SalidasController } from './salidas.controller';
import { SalidasService } from './salidas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Salida, Pasajero, Encomienda, Camioneta, Ruta]), EncomiendasModule],
  controllers: [SalidasController],
  providers: [SalidasService, ManifiestoService],
  exports: [SalidasService],
})
export class SalidasModule {}
