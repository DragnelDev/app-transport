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
import { EstadoSalida } from '../common/enums';
import { AuthUser } from '../common/interfaces/auth-user';
import {
  CambiarEstadoSalidaDto,
  CreateSalidaDto,
  UpdateSalidaDto,
} from './dto/salidas.dto';
import { SalidasService } from './salidas.service';

@Controller('salidas')
@ApiTags('Salidas')
@ApiBearerAuth('bearer')
export class SalidasController {
  constructor(private readonly service: SalidasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar salidas con filtros' })
  list(
    @Query('fecha') fecha?: string,
    @Query('estado') estado?: EstadoSalida,
    @Query('rutaId') rutaId?: string,
    @Query('oficina') oficina?: string,
  ) {
    return this.service.list({
      fecha,
      estado,
      oficina,
      rutaId: rutaId ? +rutaId : undefined,
    });
  }

  @Get('cola')
  @ApiOperation({ summary: 'Consultar salidas en cola' })
  cola(@Query('oficina') oficina?: string) {
    return this.service.cola(oficina);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar salida' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/asientos')
  @ApiOperation({ summary: 'Consultar disponibilidad de asientos' })
  asientos(@Param('id', ParseIntPipe) id: number) {
    return this.service.asientos(id);
  }

  @Post()
  @ApiOperation({ summary: 'Programar salida' })
  create(@Body() dto: CreateSalidaDto, @CurrentUser() u: AuthUser) {
    return this.service.create(dto, u);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar salida' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSalidaDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.update(id, dto, u);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado de salida' })
  estado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoSalidaDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.cambiarEstado(id, dto.estado, u);
  }

  @Get(':id/manifiesto')
  @ApiOperation({ summary: 'Descargar manifiesto PDF' })
  @Header('Content-Type', 'application/pdf')
  async manifiesto(@Param('id', ParseIntPipe) id: number) {
    return new StreamableFile(await this.service.manifiestoPdf(id), {
      disposition: `inline; filename="manifiesto-${id}.pdf"`,
    });
  }

  @Post(':id/manifiesto/whatsapp')
  @ApiOperation({ summary: 'Enviar manifiesto por WhatsApp' })
  manifiestoWhatsapp(@Param('id', ParseIntPipe) id: number) {
    return this.service.manifiestoWhatsapp(id);
  }
}
