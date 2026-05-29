import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async findAll(clinicId: number): Promise<User[]> {
    return this.repo.find({
      where: { clinicId, isActive: true },
      order: { name: 'ASC' },
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
      data.password = await bcrypt.hash(data.password, 10);
    } else {
      delete data.password;
    }
    Object.assign(user, data);
    return this.repo.save(user);
  }

  async remove(id: number, clinicId?: number): Promise<void> {
    const user = await this.findOne(id, clinicId);
    user.isActive = false;
    await this.repo.save(user);
  }
}
