import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { CreateCamionetaDto, UpdateCamionetaDto } from './camionetas.dto';
import { CamionetasService } from './camionetas.service';

@Controller('camionetas')
export class CamionetasController {
  constructor(private readonly service: CamionetasService) {}

  @Get() findAll(@Query('activas') activas?: string) { return this.service.findAll(activas === 'true'); }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post() @Roles('Administrador')
  create(@Body() dto: CreateCamionetaDto, @CurrentUser() u: AuthUser) { return this.service.create(dto, u); }

  @Patch(':id') @Roles('Administrador')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCamionetaDto, @CurrentUser() u: AuthUser) {
    return this.service.update(id, dto, u);
  }
}
