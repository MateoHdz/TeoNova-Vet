import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Customer } from './customer.entity';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private repo: Repository<Customer>) {}

  findAll(clinicId: number, search?: string): Promise<Customer[]> {
    const where: any = { clinicId, isActive: true };
    if (search) where.name = Like(`%${search}%`);
    return this.repo.find({ where, relations: ['pets'], order: { name: 'ASC' } });
  }

  async findAllPaginated(clinicId: number, search: string | undefined, page: number, limit: number) {
    const where: any = { clinicId, isActive: true };
    if (search) where.name = Like(`%${search}%`);
    const skip = (page - 1) * limit;
    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['pets'],
      order: { name: 'ASC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, clinicId: number): Promise<Customer> {
    const c = await this.repo.findOne({ where: { id, clinicId }, relations: ['pets'] });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  create(clinicId: number, data: Partial<Customer>): Promise<Customer> {
    return this.repo.save(this.repo.create({ ...data, clinicId }));
  }

  async update(id: number, clinicId: number, data: Partial<Customer>): Promise<Customer> {
    const c = await this.findOne(id, clinicId);
    Object.assign(c, data);
    return this.repo.save(c);
  }

  async remove(id: number, clinicId: number): Promise<void> {
    const c = await this.findOne(id, clinicId);
    c.isActive = false;
    await this.repo.save(c);
  }
}
