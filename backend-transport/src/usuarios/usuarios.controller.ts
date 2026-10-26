import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuarios.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@Roles('Administrador')
@ApiTags('Usuarios')
@ApiBearerAuth('bearer')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUsuarioDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.service.update(id, dto, u);
  }
}
