import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthUser } from '../common/interfaces/auth-user';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class AuthService {
  constructor(private readonly usuarios: UsuariosService, private readonly jwt: JwtService) {}

  async login(usuario: string, password: string) {
    const u = await this.usuarios.findByUsuarioConPassword(usuario);
    if (!u || !u.activo || !(await bcrypt.compare(password, u.passwordHash))) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    const user = this.usuarios.toAuthUser(u);
    const accessToken = await this.jwt.signAsync({ sub: u.id, rol: u.rol });
    return { accessToken, user };
  }

  async cambiarPassword(user: AuthUser, actual: string, nueva: string) {
    const u = await this.usuarios.findByUsuarioConPassword(user.usuario);
    if (!u || !(await bcrypt.compare(actual, u.passwordHash))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    await this.usuarios.cambiarPassword(u.id, nueva);
    return { ok: true };
  }
}
