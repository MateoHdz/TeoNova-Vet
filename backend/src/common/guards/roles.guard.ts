import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>('roles', context.getHandler())
      ?? this.reflector.get<string[]>('roles', context.getClass());

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No autenticado');

    // superadmin bypasses all role checks
    if (user.role === 'superadmin') return true;

    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere: ${required.join(' o ')}`
      );
    }
    return true;
  }
}
