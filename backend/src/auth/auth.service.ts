import {
  Injectable, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    // 1. User must exist and be active
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Password check
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Clinic-level checks (only for non-superadmin)
    if (user.role !== 'superadmin') {
      if (!user.clinicId) {
        throw new ForbiddenException('Usuario no asociado a ninguna clínica');
      }
      if (!user.clinic) {
        throw new ForbiddenException('Clínica no encontrada');
      }
      if (!user.clinic.isActive) {
        throw new ForbiddenException(
          'Esta clínica se encuentra suspendida. Contacte al soporte en soporte@vetpos.com'
        );
      }
    }

    const payload = {
      sub:      user.id,
      clinicId: user.clinicId ?? null,
      email:    user.email,
      role:     user.role,
      name:     user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id:       user.id,
        clinicId: user.clinicId ?? null,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        clinic: user.clinic
          ? {
              id:       user.clinic.id,
              name:     user.clinic.name,
              slug:     user.clinic.slug,
              plan:     user.clinic.plan,
              isActive: user.clinic.isActive,
            }
          : null,
      },
    };
  }
}
