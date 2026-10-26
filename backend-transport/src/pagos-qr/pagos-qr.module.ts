import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagoQr } from './entities/pago-qr.entity';
import { PagosQrController } from './pagos-qr.controller';
import { PagosQrService } from './pagos-qr.service';

@Module({
  imports: [TypeOrmModule.forFeature([PagoQr])],
  controllers: [PagosQrController],
  providers: [PagosQrService],
  exports: [PagosQrService],
})
export class PagosQrModule {}
