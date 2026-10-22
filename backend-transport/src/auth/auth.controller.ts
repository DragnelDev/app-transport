import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '../common/decorators';
import { AuthUser } from '../common/interfaces/auth-user';
import { CambiarPasswordDto, LoginDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.usuario, dto.password);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Patch('password')
  cambiarPassword(@CurrentUser() user: AuthUser, @Body() dto: CambiarPasswordDto) {
    return this.auth.cambiarPassword(user, dto.actual, dto.nueva);
  }
}
