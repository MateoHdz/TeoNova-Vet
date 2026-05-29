import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Clinic } from './clinic.entity';
import { User } from '../users/user.entity';

export interface CreateClinicDto {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  nit?: string;
  plan?: string;
  // Admin user fields
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    @InjectRepository(User)   private userRepo:   Repository<User>,
    private dataSource: DataSource,
  ) {}

  findAll(): Promise<Clinic[]> {
    return this.clinicRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Clinic> {
    const c = await this.clinicRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Clínica no encontrada');
    return c;
  }

  async findBySlug(slug: string): Promise<Clinic | null> {
    return this.clinicRepo.findOne({ where: { slug } });
  }

  /**
   * Creates clinic + admin user atomically in one transaction.
   * No manual user creation needed.
   */
  async create(dto: CreateClinicDto): Promise<{ clinic: Clinic; admin: Partial<User> }> {
    // Validate slug unique
    const slugExists = await this.findBySlug(dto.slug);
    if (slugExists) throw new ConflictException(`El slug "${dto.slug}" ya está en uso`);

    // Validate admin email unique
    const emailExists = await this.userRepo.findOne({ where: { email: dto.adminEmail } });
    if (emailExists) throw new ConflictException(`El email "${dto.adminEmail}" ya está registrado`);

    return this.dataSource.transaction(async (manager) => {
      // 1. Create clinic
      const clinic = manager.create(Clinic, {
        name:    dto.name,
        slug:    dto.slug,
        email:   dto.email   || null,
        phone:   dto.phone   || null,
        address: dto.address || null,
        nit:     dto.nit     || null,
        plan:    dto.plan    || 'trial',
        isActive: true,
      });
      const savedClinic = await manager.save(Clinic, clinic);

      // 2. Create admin user for this clinic
      const hash = await bcrypt.hash(dto.adminPassword, 10);
      const admin = manager.create(User, {
        clinicId: savedClinic.id,
        name:     dto.adminName,
        email:    dto.adminEmail,
        password: hash,
        role:     'admin',
        isActive: true,
      });
      const savedAdmin = await manager.save(User, admin);

      return {
        clinic: savedClinic,
        admin: {
          id:    savedAdmin.id,
          name:  savedAdmin.name,
          email: savedAdmin.email,
          role:  savedAdmin.role,
        },
      };
    });
  }

  async update(id: number, data: Partial<Clinic>): Promise<Clinic> {
    const c = await this.findOne(id);
    // Prevent slug change if already exists for another clinic
    if (data.slug && data.slug !== c.slug) {
      const exists = await this.findBySlug(data.slug);
      if (exists) throw new ConflictException(`El slug "${data.slug}" ya está en uso`);
    }
    Object.assign(c, data);
    return this.clinicRepo.save(c);
  }

  async setStatus(id: number, isActive: boolean): Promise<Clinic> {
    const c = await this.findOne(id);
    c.isActive = isActive;
    return this.clinicRepo.save(c);
  }

  async getStats(id: number) {
    const result = await this.clinicRepo.query(`
      SELECT
        (SELECT COUNT(*) FROM users     WHERE clinic_id = ? AND is_active = 1)            AS users,
        (SELECT COUNT(*) FROM customers WHERE clinic_id = ? AND is_active = 1)            AS customers,
        (SELECT COUNT(*) FROM products  WHERE clinic_id = ? AND is_active = 1)            AS products,
        (SELECT COUNT(*) FROM sales     WHERE clinic_id = ? AND status = 'completed'
          AND sold_at >= DATE_FORMAT(NOW(), '%Y-%m-01'))                                   AS salesThisMonth,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE clinic_id = ?
          AND status = 'completed'
          AND sold_at >= DATE_FORMAT(NOW(), '%Y-%m-01'))                                   AS revenueThisMonth
    `, [id, id, id, id, id]);
    return result[0];
  }

  async getPlatformSummary() {
    const result = await this.clinicRepo.query(`
      SELECT
        (SELECT COUNT(*) FROM clinics)                                 AS totalClinics,
        (SELECT COUNT(*) FROM clinics WHERE is_active = 1)            AS activeClinics,
        (SELECT COUNT(*) FROM clinics WHERE is_active = 0)            AS suspendedClinics,
        (SELECT COUNT(*) FROM clinics WHERE plan = 'trial')           AS trialClinics,
        (SELECT COUNT(*) FROM users   WHERE is_active = 1 AND role != 'superadmin') AS totalUsers,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE status = 'completed'
          AND sold_at >= DATE_FORMAT(NOW(), '%Y-%m-01'))              AS platformRevenue
    `);
    return result[0];
  }
}
