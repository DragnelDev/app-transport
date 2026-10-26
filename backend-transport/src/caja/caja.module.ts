import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CierreCaja } from './entities/cierre-caja.entity';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';

@Module({
  imports: [TypeOrmModule.forFeature([CierreCaja])],
  controllers: [CajaController],
  providers: [CajaService],
})
export class CajaModule {}
