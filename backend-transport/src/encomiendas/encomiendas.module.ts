import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosQrModule } from '../pagos-qr/pagos-qr.module';
import { Encomienda } from './entities/encomienda.entity';
import { EncomiendasController } from './encomiendas.controller';
import { EncomiendasService } from './encomiendas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Encomienda]), PagosQrModule],
  controllers: [EncomiendasController],
  providers: [EncomiendasService],
  exports: [EncomiendasService],
})
export class EncomiendasModule {}
