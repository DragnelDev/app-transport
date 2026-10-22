import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC } from '../decorators';
import { UsuariosService } from '../../usuarios/usuarios.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly usuarios: UsuariosService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (publico) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Token requerido');

    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token);
      const user = await this.usuarios.findActivo(payload.sub);
      if (!user) throw new Error('inactivo');
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
  }
}
