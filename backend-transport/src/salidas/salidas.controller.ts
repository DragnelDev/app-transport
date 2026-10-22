import {
  Body, Controller, Get, Header, Param, ParseIntPipe, Patch, Post, Query, StreamableFile,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators';
import { EstadoSalida } from '../common/enums';
import { AuthUser } from '../common/interfaces/auth-user';
import { CambiarEstadoSalidaDto, CreateSalidaDto, UpdateSalidaDto } from './salidas.dto';
import { SalidasService } from './salidas.service';

@Controller('salidas')
export class SalidasController {
  constructor(private readonly service: SalidasService) {}

  @Get()
  list(
    @Query('fecha') fecha?: string,
    @Query('estado') estado?: EstadoSalida,
    @Query('rutaId') rutaId?: string,
    @Query('oficina') oficina?: string,
  ) {
    return this.service.list({ fecha, estado, oficina, rutaId: rutaId ? +rutaId : undefined });
  }

  @Get('cola') cola(@Query('oficina') oficina?: string) { return this.service.cola(oficina); }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Get(':id/asientos') asientos(@Param('id', ParseIntPipe) id: number) { return this.service.asientos(id); }

  @Post() create(@Body() dto: CreateSalidaDto, @CurrentUser() u: AuthUser) { return this.service.create(dto, u); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSalidaDto, @CurrentUser() u: AuthUser) {
    return this.service.update(id, dto, u);
  }

  @Patch(':id/estado')
  estado(@Param('id', ParseIntPipe) id: number, @Body() dto: CambiarEstadoSalidaDto, @CurrentUser() u: AuthUser) {
    return this.service.cambiarEstado(id, dto.estado, u);
  }

  @Get(':id/manifiesto')
  @Header('Content-Type', 'application/pdf')
  async manifiesto(@Param('id', ParseIntPipe) id: number) {
    return new StreamableFile(await this.service.manifiestoPdf(id), {
      disposition: `inline; filename="manifiesto-${id}.pdf"`,
    });
  }

  @Post(':id/manifiesto/whatsapp')
  manifiestoWhatsapp(@Param('id', ParseIntPipe) id: number) { return this.service.manifiestoWhatsapp(id); }
}
