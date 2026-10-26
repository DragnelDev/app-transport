import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
@Roles('Administrador')
@ApiTags('Notificaciones')
@ApiBearerAuth('bearer')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones' })
  list(@Query('estado') estado?: string) {
    return this.service.list(estado);
  }

  @Post(':id/reintentar')
  @ApiOperation({ summary: 'Reintentar envío de notificación' })
  reintentar(@Param('id', ParseIntPipe) id: number) {
    return this.service.reintentar(id);
  }
}
