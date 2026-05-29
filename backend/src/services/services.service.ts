import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './service.entity';

@Injectable()
export class ServicesService {
  constructor(@InjectRepository(Service) private repo: Repository<Service>) {}
  findAll(clinicId: number) { return this.repo.find({ where:{ clinicId, isActive:true }, order:{ name:'ASC' } }); }
  async findOne(id: number, clinicId: number) {
    const s = await this.repo.findOne({ where:{ id, clinicId } });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    return s;
  }
  create(clinicId: number, data: any) { return this.repo.save(this.repo.create({ ...data, clinicId })); }
  async update(id: number, clinicId: number, data: any) { const s = await this.findOne(id,clinicId); Object.assign(s,data); return this.repo.save(s); }
  async remove(id: number, clinicId: number) { const s = await this.findOne(id,clinicId); s.isActive=false; await this.repo.save(s); }
}
