import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  // ── Clinic-scoped list (admin / employee view) ─────────────────
  async findAll(clinicId: number): Promise<User[]> {
    return this.repo.find({
      where: { clinicId },
      order: { name: 'ASC' },
    });
  }

  // ── Global list (superadmin only) ──────────────────────────────
  async findAllGlobal(): Promise<User[]> {
    return this.repo.find({
      relations: ['clinic'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, clinicId?: number): Promise<User> {
    const where: any = { id };
    if (clinicId !== undefined) where.clinicId = clinicId;
    const user = await this.repo.findOne({ where, relations: ['clinic'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email }, relations: ['clinic'] });
  }

  async create(data: Partial<User> & { clinicId: number }): Promise<User> {
    const exists = await this.findByEmail(data.email);
    if (exists) throw new ConflictException('El email ya está registrado');
    const hash = await bcrypt.hash(data.password, 10);
    const user = this.repo.create({ ...data, password: hash });
    return this.repo.save(user);
  }

  async update(id: number, data: Partial<User>, clinicId?: number): Promise<User> {
    const user = await this.findOne(id, clinicId);
    if (data.password) {
      if (data.password.length < 8) {
        throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
      }
      data.password = await bcrypt.hash(data.password, 10);
    } else {
      delete data.password;
    }
    Object.assign(user, data);
    return this.repo.save(user);
  }

  // ── Soft delete (suspender) ────────────────────────────────────
  async remove(id: number, clinicId?: number): Promise<void> {
    const user = await this.findOne(id, clinicId);
    user.isActive = false;
    await this.repo.save(user);
  }

  // ── Superadmin: change any user's password ─────────────────────
  async resetPassword(id: number, newPassword: string): Promise<{ message: string }> {
    if (newPassword.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(newPassword, 10);
    await this.repo.save(user);
    return { message: 'Contraseña actualizada correctamente' };
  }

  // ── Superadmin: hard delete ────────────────────────────────────
  async permanentDelete(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id);
    if (user.role === 'superadmin') {
      throw new BadRequestException('No se puede eliminar un superadmin');
    }
    await this.repo.remove(user);
    return { message: 'Usuario eliminado permanentemente' };
  }
}
