import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Prevents superadmin from accessing clinic-specific data.
 * Superadmin manages the platform, not individual clinics.
 */
@Injectable()
export class ClinicOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role === 'superadmin') {
      throw new ForbiddenException(
        'Superadmin no puede acceder a datos internos de clínicas'
      );
    }
    if (!user?.clinicId) {
      throw new ForbiddenException('No hay clínica asociada a este usuario');
    }
    return true;
  }
}
