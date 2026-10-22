import {
  Body, Controller, Get, Header, Param, ParseIntPipe, Patch, Post, Query, StreamableFile,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators';
import { EstadoEntrega } from '../common/enums';
import { AuthUser } from '../common/interfaces/auth-user';
import {
  ActualizarEncomiendaDto, AsignarSalidaDto, CobrarDto, CreateEncomiendaDto, EntregarDto,
} from './encomiendas.dto';
import { EncomiendasService } from './encomiendas.service';

@Controller('encomiendas')
export class EncomiendasController {
  constructor(private readonly service: EncomiendasService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('estado') estado?: EstadoEntrega,
    @Query('salidaId') salidaId?: string,
    @Query('pendientePago') pendientePago?: string,
    @Query('oficinaDestino') oficinaDestino?: string,
  ) {
    return this.service.list({
      q, estado, oficinaDestino,
      salidaId: salidaId ? +salidaId : undefined,
      pendientePago: pendientePago === 'true',
    });
  }

  @Get('buscar')
  buscar(@Query('q') q = '') { return q.trim() ? this.service.buscar(q) : []; }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post() create(@Body() dto: CreateEncomiendaDto, @CurrentUser() u: AuthUser) { return this.service.create(dto, u); }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarEncomiendaDto, @CurrentUser() u: AuthUser) {
    return this.service.actualizar(id, dto, u);
  }

  @Post(':id/asignar-salida')
  asignar(@Param('id', ParseIntPipe) id: number, @Body() dto: AsignarSalidaDto, @CurrentUser() u: AuthUser) {
    return this.service.asignarSalida(id, dto.salidaId, u);
  }

  @Post(':id/cobrar')
  cobrar(@Param('id', ParseIntPipe) id: number, @Body() dto: CobrarDto, @CurrentUser() u: AuthUser) {
    return this.service.cobrar(id, dto, u);
  }

  @Post(':id/marcar-listo')
  listo(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.service.marcarListo(id, u); }

  @Post(':id/entregar')
  entregar(@Param('id', ParseIntPipe) id: number, @Body() dto: EntregarDto, @CurrentUser() u: AuthUser) {
    return this.service.entregar(id, dto, u);
  }

  @Get(':id/etiqueta/escpos')
  @Header('Content-Type', 'application/octet-stream')
  async etiqueta(@Param('id', ParseIntPipe) id: number, @Query('columnas') columnas?: string) {
    return new StreamableFile(await this.service.etiquetaEscPos(id, columnas ? +columnas : 32));
  }
}
