import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private repo: Repository<Appointment>,
    private salesService: SalesService,
  ) {}

  findAll(clinicId: number, from?: string, to?: string, status?: AppointmentStatus) {
    const qb = this.repo.createQueryBuilder('a')
      .leftJoinAndSelect('a.customer','customer')
      .leftJoinAndSelect('a.pet','pet')
      .leftJoinAndSelect('a.service','service')
      .leftJoinAndSelect('a.user','user')
      .where('a.clinicId = :clinicId', { clinicId })
      .orderBy('a.scheduledAt','ASC');
    if (from && to) {
      const fromDate = from.includes('T') || from.includes('Z') ? new Date(from) : new Date(from);
      const toDate = to.includes('T') || to.includes('Z') ? new Date(to) : new Date(to + 'T23:59:59');
      qb.andWhere('a.scheduledAt BETWEEN :from AND :to', { from: fromDate, to: toDate });
    }
    if (status) qb.andWhere('a.status = :status', { status });
    return qb.getMany();
  }

  async findAllPaginated(clinicId: number, from: string | undefined, to: string | undefined, status: AppointmentStatus | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const qb = this.repo.createQueryBuilder('a')
      .leftJoinAndSelect('a.customer','customer')
      .leftJoinAndSelect('a.pet','pet')
      .leftJoinAndSelect('a.service','service')
      .leftJoinAndSelect('a.user','user')
      .where('a.clinicId = :clinicId', { clinicId })
      .orderBy('a.scheduledAt','ASC')
      .skip(skip)
      .take(limit);
    if (from && to) {
      const fromDate = from.includes('T') || from.includes('Z') ? new Date(from) : new Date(from);
      const toDate = to.includes('T') || to.includes('Z') ? new Date(to) : new Date(to + 'T23:59:59');
      qb.andWhere('a.scheduledAt BETWEEN :from AND :to', { from: fromDate, to: toDate });
    }
    if (status) qb.andWhere('a.status = :status', { status });
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, clinicId: number) {
    const a = await this.repo.findOne({ where:{ id, clinicId }, relations:['customer','pet','service','user'] });
    if (!a) throw new NotFoundException('Cita no encontrada');
    return a;
  }

  async create(dto: any, userId: number, clinicId: number) {
    const a = this.repo.create({ ...dto, clinicId, userId, scheduledAt: new Date(dto.scheduledAt), status:'pending' });
    const saved = await this.repo.save(a);
    const id = Array.isArray(saved) ? saved[0].id : (saved as Appointment).id;
    return this.findOne(id, clinicId);
  }

  async updateStatus(id: number, clinicId: number, status: AppointmentStatus, userId?: number) {
    const a = await this.findOne(id, clinicId);
    a.status = status;
    await this.repo.save(a);

    return this.findOne(id, clinicId);
  }

  async update(id: number, clinicId: number, dto: any) {
    const a = await this.findOne(id, clinicId);
    if (dto.scheduledAt) a.scheduledAt = new Date(dto.scheduledAt);
    if (dto.price  !== undefined) a.price  = dto.price;
    if (dto.notes  !== undefined) a.notes  = dto.notes;
    if (dto.customerId) a.customerId = dto.customerId;
    if (dto.petId)      a.petId      = dto.petId;
    if (dto.serviceId)  a.serviceId  = dto.serviceId;
    await this.repo.save(a);
    return this.findOne(id, clinicId);
  }

  async remove(id: number, clinicId: number) {
    const a = await this.findOne(id, clinicId);
    a.status = 'cancelled';
    await this.repo.save(a);
  }

  async getTodaySummary(clinicId: number, from?: string, to?: string) {
    let all: Appointment[];
    if (from && to) {
      all = await this.findAll(clinicId, from, to);
    } else {
      const today = new Date().toISOString().split('T')[0];
      all = await this.findAll(clinicId, today, today);
    }
    return { 
      total: all.length, 
      pending: all.filter(a => ['pending', 'in_progress', 'bath', 'cut'].includes(a.status)).length, 
      done: all.filter(a => ['done', 'delivered'].includes(a.status)).length 
    };
  }
}
