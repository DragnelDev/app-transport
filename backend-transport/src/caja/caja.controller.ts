import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { CajaService } from './caja.service';
import { CerrarCajaDto } from './dto/caja.dto';

@Controller('caja')
@ApiTags('Caja')
@ApiBearerAuth('bearer')
export class CajaController {
  constructor(private readonly service: CajaService) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Consultar resumen de caja' })
  resumen(@CurrentUser() u: AuthUser, @Query('usuarioId') usuarioId?: string) {
    return this.service.resumen(u, usuarioId ? +usuarioId : undefined);
  }

  @Post('cerrar')
  @ApiOperation({ summary: 'Cerrar caja' })
  cerrar(@CurrentUser() u: AuthUser, @Body() dto: CerrarCajaDto) {
    return this.service.cerrar(u, dto.efectivoContado, dto.observaciones);
  }

  @Get('historial')
  @ApiOperation({ summary: 'Consultar historial de cierres de caja' })
  historial(
    @CurrentUser() u: AuthUser,
    @Query('usuarioId') usuarioId?: string,
  ) {
    return this.service.historial(u, usuarioId ? +usuarioId : undefined);
  }

  @Get('cierres/:id')
  @ApiOperation({ summary: 'Consultar cierre de caja' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) {
    return this.service.findOne(id, u);
  }
}
