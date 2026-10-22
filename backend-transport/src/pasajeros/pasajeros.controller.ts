import {
  Body, Controller, Delete, Get, Header, Param, ParseIntPipe, Patch, Post, Query, StreamableFile,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { ActualizarPasajeroDto, AnularPasajeDto, VenderPasajeDto } from './pasajeros.dto';
import { PasajerosService } from './pasajeros.service';

@Controller('pasajeros')
export class PasajerosController {
  constructor(private readonly service: PasajerosService) {}

  @Get()
  list(
    @Query('salidaId') salidaId?: string,
    @Query('q') q?: string,
    @Query('anulados') anulados?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.list({ salidaId: salidaId ? +salidaId : undefined, q, anulados: anulados === 'true' }, user!);
  }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post() vender(@Body() dto: VenderPasajeDto, @CurrentUser() u: AuthUser) { return this.service.vender(dto, u); }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarPasajeroDto, @CurrentUser() u: AuthUser) {
    return this.service.actualizar(id, dto, u);
  }

  @Delete(':id')
  anular(@Param('id', ParseIntPipe) id: number, @Body() dto: AnularPasajeDto, @CurrentUser() u: AuthUser) {
    return this.service.anular(id, dto.motivo, u);
  }

  @Get(':id/ticket/escpos')
  @Header('Content-Type', 'application/octet-stream')
  async ticket(@Param('id', ParseIntPipe) id: number, @Query('columnas') columnas?: string) {
    return new StreamableFile(await this.service.ticketEscPos(id, columnas ? +columnas : 32));
  }
}
