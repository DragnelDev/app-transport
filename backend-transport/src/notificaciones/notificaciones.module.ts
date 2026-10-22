import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificacion } from './notificacion.entity';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService, WHATSAPP_QUEUE } from './notificaciones.service';
import { WhatsappProcessor } from './whatsapp.processor';
import { WhatsappProvider } from './whatsapp.provider';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notificacion]), BullModule.registerQueue({ name: WHATSAPP_QUEUE })],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, WhatsappProvider, WhatsappProcessor],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
