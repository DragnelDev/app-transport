import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AuthUser, Rol } from '../interfaces/auth-user';

export const IS_PUBLIC = 'isPublic';
export const ROLES_KEY = 'roles';

/** Marca un endpoint como público (sin JWT). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restringe un endpoint a ciertos roles. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

/** Inyecta el usuario autenticado. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
