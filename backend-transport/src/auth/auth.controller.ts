import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { AuthService } from './auth.service';
import { CambiarPasswordDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.usuario, dto.password);
  }

  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Consultar el usuario autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Patch('password')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Cambiar contraseña' })
  cambiarPassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.auth.cambiarPassword(user, dto.actual, dto.nueva);
  }
}
