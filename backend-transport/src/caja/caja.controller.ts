import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { CerrarCajaDto } from './caja.dto';
import { CajaService } from './caja.service';

@Controller('caja')
export class CajaController {
  constructor(private readonly service: CajaService) {}

  @Get('resumen')
  resumen(@CurrentUser() u: AuthUser, @Query('usuarioId') usuarioId?: string) {
    return this.service.resumen(u, usuarioId ? +usuarioId : undefined);
  }

  @Post('cerrar')
  cerrar(@CurrentUser() u: AuthUser, @Body() dto: CerrarCajaDto) {
    return this.service.cerrar(u, dto.efectivoContado, dto.observaciones);
  }

  @Get('historial')
  historial(@CurrentUser() u: AuthUser, @Query('usuarioId') usuarioId?: string) {
    return this.service.historial(u, usuarioId ? +usuarioId : undefined);
  }

  @Get('cierres/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.service.findOne(id, u); }
}
