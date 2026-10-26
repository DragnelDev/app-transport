import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { EstadoEntrega } from '../common/enums';
import { AuthUser } from '../common/interfaces/auth-user';
import {
  ActualizarEncomiendaDto,
  AsignarSalidaDto,
  CobrarDto,
  CreateEncomiendaDto,
  EntregarDto,
} from './dto/encomiendas.dto';
import { EncomiendasService } from './encomiendas.service';

@Controller('encomiendas')
@ApiTags('Encomiendas')
@ApiBearerAuth('bearer')
export class EncomiendasController {
  constructor(private readonly service: EncomiendasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar encomiendas con filtros' })
  list(
    @Query('q') q?: string,
    @Query('estado') estado?: EstadoEntrega,
    @Query('salidaId') salidaId?: string,
    @Query('pendientePago') pendientePago?: string,
    @Query('oficinaDestino') oficinaDestino?: string,
  ) {
    return this.service.list({
      q,
      estado,
      oficinaDestino,
      salidaId: salidaId ? +salidaId : undefined,
      pendientePago: pendientePago === 'true',
    });
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Buscar encomiendas' })
  buscar(@Query('q') q = '') {
    return q.trim() ? this.service.buscar(q) : [];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar encomienda' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar encomienda' })
  create(@Body() dto: CreateEncomiendaDto, @CurrentUser() u: AuthUser) {
    return this.service.create(dto, u);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar encomienda' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEncomiendaDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.actualizar(id, dto, u);
  }

  @Post(':id/asignar-salida')
  @ApiOperation({ summary: 'Asignar encomienda a una salida' })
  asignar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarSalidaDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.asignarSalida(id, dto.salidaId, u);
  }

  @Post(':id/cobrar')
  @ApiOperation({ summary: 'Cobrar encomienda' })
  cobrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CobrarDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.cobrar(id, dto, u);
  }

  @Post(':id/marcar-listo')
  @ApiOperation({ summary: 'Marcar encomienda como lista para entrega' })
  listo(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) {
    return this.service.marcarListo(id, u);
  }

  @Post(':id/entregar')
  @ApiOperation({ summary: 'Registrar entrega de encomienda' })
  entregar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EntregarDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.entregar(id, dto, u);
  }

  @Get(':id/etiqueta/escpos')
  @ApiOperation({ summary: 'Descargar etiqueta ESC/POS' })
  @Header('Content-Type', 'application/octet-stream')
  async etiqueta(
    @Param('id', ParseIntPipe) id: number,
    @Query('columnas') columnas?: string,
  ) {
    return new StreamableFile(
      await this.service.etiquetaEscPos(id, columnas ? +columnas : 32),
    );
  }
}
