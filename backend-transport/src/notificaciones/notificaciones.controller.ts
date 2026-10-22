import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Roles } from '../common/decorators';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
@Roles('Administrador')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  @Get() list(@Query('estado') estado?: string) { return this.service.list(estado); }

  @Post(':id/reintentar') reintentar(@Param('id', ParseIntPipe) id: number) { return this.service.reintentar(id); }
}
