import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';

export interface CreateExpenseDto {
  description: string;
  amount: number;
  category?: string;
  date: string;
  notes?: string;
}

@Injectable()
export class ExpensesService {
  constructor(@InjectRepository(Expense) private repo: Repository<Expense>) {}

  findAll(clinicId: number, from?: string, to?: string, category?: string): Promise<Expense[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .where('e.clinicId = :clinicId', { clinicId })
      .orderBy('e.date', 'DESC')
      .addOrderBy('e.createdAt', 'DESC');

    if (from && to) {
      qb.andWhere('e.date BETWEEN :from AND :to', { from, to });
    }
    if (category) {
      qb.andWhere('e.category = :category', { category });
    }
    return qb.getMany();
  }

  async findAllPaginated(clinicId: number, from: string | undefined, to: string | undefined, category: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .where('e.clinicId = :clinicId', { clinicId })
      .orderBy('e.date', 'DESC')
      .addOrderBy('e.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (from && to) {
      qb.andWhere('e.date BETWEEN :from AND :to', { from, to });
    }
    if (category) {
      qb.andWhere('e.category = :category', { category });
    }
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, clinicId: number): Promise<Expense> {
    const e = await this.repo.findOne({ where: { id, clinicId }, relations: ['user'] });
    if (!e) throw new NotFoundException('Gasto no encontrado');
    return e;
  }

  async create(dto: CreateExpenseDto, userId: number, clinicId: number): Promise<Expense> {
    const expense = this.repo.create({
      ...dto,
      amount:   Number(dto.amount),
      clinicId,
      userId,
      date:     dto.date,
      category: (dto.category as any) || 'otros',
    });
    const saved = await this.repo.save(expense);
    return this.findOne(saved.id, clinicId);
  }

  async update(id: number, dto: Partial<CreateExpenseDto>, clinicId: number): Promise<Expense> {
    const e = await this.findOne(id, clinicId);
    if (dto.amount !== undefined) dto.amount = Number(dto.amount);
    Object.assign(e, dto);
    await this.repo.save(e);
    return this.findOne(id, clinicId);
  }

  async remove(id: number, clinicId: number): Promise<{ message: string }> {
    const e = await this.findOne(id, clinicId);
    await this.repo.remove(e);
    return { message: 'Gasto eliminado' };
  }

  async getSummary(clinicId: number, from: string, to: string) {
    const result = await this.repo
      .createQueryBuilder('e')
      .select('e.category', 'category')
      .addSelect('COUNT(e.id)', 'count')
      .addSelect('COALESCE(SUM(e.amount), 0)', 'total')
      .where('e.clinicId = :clinicId AND e.date BETWEEN :from AND :to', { clinicId, from, to })
      .groupBy('e.category')
      .orderBy('SUM(e.amount)', 'DESC')
      .getRawMany();

    const totalAmount = result.reduce((s, r) => s + Number(r.total), 0);
    return { byCategory: result, totalAmount };
  }

  async getByDay(clinicId: number, from: string, to: string) {
    return this.repo
      .createQueryBuilder('e')
      .select('e.date', 'date')
      .addSelect('COALESCE(SUM(e.amount), 0)', 'total')
      .addSelect('COUNT(e.id)', 'count')
      .where('e.clinicId = :clinicId AND e.date BETWEEN :from AND :to', { clinicId, from, to })
      .groupBy('e.date')
      .orderBy('e.date', 'ASC')
      .getRawMany();
  }
}
