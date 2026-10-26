import {
  Body,
  Controller,
  Delete,
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
import { AuthUser } from '../common/interfaces/auth-user';
import {
  ActualizarPasajeroDto,
  AnularPasajeDto,
  VenderPasajeDto,
} from './dto/pasajeros.dto';
import { PasajerosService } from './pasajeros.service';

@Controller('pasajeros')
@ApiTags('Pasajeros y pasajes')
@ApiBearerAuth('bearer')
export class PasajerosController {
  constructor(private readonly service: PasajerosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pasajeros y pasajes' })
  list(
    @Query('salidaId') salidaId?: string,
    @Query('q') q?: string,
    @Query('anulados') anulados?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.list(
      {
        salidaId: salidaId ? +salidaId : undefined,
        q,
        anulados: anulados === 'true',
      },
      user!,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar pasaje' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Vender pasaje' })
  vender(@Body() dto: VenderPasajeDto, @CurrentUser() u: AuthUser) {
    return this.service.vender(dto, u);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de pasaje' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPasajeroDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.actualizar(id, dto, u);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Anular pasaje' })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularPasajeDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.anular(id, dto.motivo, u);
  }

  @Get(':id/ticket/escpos')
  @ApiOperation({ summary: 'Descargar ticket ESC/POS' })
  @Header('Content-Type', 'application/octet-stream')
  async ticket(
    @Param('id', ParseIntPipe) id: number,
    @Query('columnas') columnas?: string,
  ) {
    return new StreamableFile(
      await this.service.ticketEscPos(id, columnas ? +columnas : 32),
    );
  }
}
