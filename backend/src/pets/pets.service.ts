import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Pet } from './pet.entity';

@Injectable()
export class PetsService {
  constructor(@InjectRepository(Pet) private repo: Repository<Pet>) {}

  findAll(clinicId: number, customerId?: number, search?: string): Promise<Pet[]> {
    const where: any = { clinicId, isActive: true };
    if (customerId) where.customerId = customerId;
    if (search) where.name = Like(`%${search}%`);
    return this.repo.find({ where, relations: ['customer'], order: { name: 'ASC' } });
  }

  async findAllPaginated(clinicId: number, customerId: number | undefined, search: string | undefined, page: number, limit: number) {
    const where: any = { clinicId, isActive: true };
    if (customerId) where.customerId = customerId;
    if (search) where.name = Like(`%${search}%`);
    const skip = (page - 1) * limit;
    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['customer'],
      order: { name: 'ASC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, clinicId: number): Promise<Pet> {
    const p = await this.repo.findOne({ where: { id, clinicId }, relations: ['customer'] });
    if (!p) throw new NotFoundException('Mascota no encontrada');
    return p;
  }

  create(clinicId: number, data: Partial<Pet>): Promise<Pet> {
    return this.repo.save(this.repo.create({ ...data, clinicId }));
  }

  async update(id: number, clinicId: number, data: Partial<Pet>): Promise<Pet> {
    const p = await this.findOne(id, clinicId);
    Object.assign(p, data);
    return this.repo.save(p);
  }

  async remove(id: number, clinicId: number): Promise<void> {
    const p = await this.findOne(id, clinicId);
    p.isActive = false;
    await this.repo.save(p);
  }
}
