import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', 'secret'),
    });
  }

  async validate(payload: any) {
    // Re-validate user on every request
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['clinic'],
    });

    if (!user) throw new UnauthorizedException('Usuario no activo');

    // Block if clinic is suspended (except superadmin)
    if (user.role !== 'superadmin' && user.clinic && !user.clinic.isActive) {
      throw new UnauthorizedException('Clínica suspendida');
    }

    return {
      userId:   user.id,
      clinicId: user.clinicId ?? null,
      email:    user.email,
      role:     user.role,
      name:     user.name,
    };
  }
}
