import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { CreateRutaDto, UpdateRutaDto } from './dto/rutas.dto';
import { RutasService } from './rutas.service';

@Controller('rutas')
@ApiTags('Rutas')
@ApiBearerAuth('bearer')
export class RutasController {
  constructor(private readonly service: RutasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar rutas' })
  findAll(@Query('activas') activas?: string) {
    return this.service.findAll(activas === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar ruta' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('Administrador')
  @ApiOperation({ summary: 'Crear ruta' })
  create(@Body() dto: CreateRutaDto, @CurrentUser() u: AuthUser) {
    return this.service.create(dto, u);
  }

  @Patch(':id')
  @Roles('Administrador')
  @ApiOperation({ summary: 'Actualizar ruta' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRutaDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.update(id, dto, u);
  }
}
