import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Camioneta } from './camioneta.entity';
import { CamionetasController } from './camionetas.controller';
import { CamionetasService } from './camionetas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Camioneta])],
  controllers: [CamionetasController],
  providers: [CamionetasService],
  exports: [CamionetasService],
})
export class CamionetasModule {}
