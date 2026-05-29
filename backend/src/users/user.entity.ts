import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Clinic } from '../clinics/clinic.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'clinic_id', unsigned: true, nullable: true })
  clinicId: number | null;

  @ManyToOne(() => Clinic, { nullable: true })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 255 })
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: ['superadmin', 'admin', 'employee'], default: 'employee' })
  role: 'superadmin' | 'admin' | 'employee';

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
