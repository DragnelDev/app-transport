import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { CreateUsuarioDto, UpdateUsuarioDto } from './usuarios.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@Roles('Administrador')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get() findAll() { return this.service.findAll(); }

  @Post() create(@Body() dto: CreateUsuarioDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto, @CurrentUser() u: AuthUser) {
    return this.service.update(id, dto, u);
  }
}
