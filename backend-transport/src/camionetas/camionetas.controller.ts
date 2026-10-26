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
import { CamionetasService } from './camionetas.service';
import { CreateCamionetaDto, UpdateCamionetaDto } from './dto/camionetas.dto';

@Controller('camionetas')
@ApiTags('Camionetas')
@ApiBearerAuth('bearer')
export class CamionetasController {
  constructor(private readonly service: CamionetasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar camionetas' })
  findAll(@Query('activas') activas?: string) {
    return this.service.findAll(activas === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar camioneta' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('Administrador')
  @ApiOperation({ summary: 'Registrar camioneta' })
  create(@Body() dto: CreateCamionetaDto, @CurrentUser() u: AuthUser) {
    return this.service.create(dto, u);
  }

  @Patch(':id')
  @Roles('Administrador')
  @ApiOperation({ summary: 'Actualizar camioneta' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCamionetaDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.update(id, dto, u);
  }
}
