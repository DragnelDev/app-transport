import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosQrModule } from '../pagos-qr/pagos-qr.module';
import { Pasajero } from './entities/pasajero.entity';
import { PasajerosController } from './pasajeros.controller';
import { PasajerosService } from './pasajeros.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pasajero]), PagosQrModule],
  controllers: [PasajerosController],
  providers: [PasajerosService],
  exports: [PasajerosService],
})
export class PasajerosModule {}
