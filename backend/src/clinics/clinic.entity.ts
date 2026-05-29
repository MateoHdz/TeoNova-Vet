import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('clinics')
export class Clinic {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 80, unique: true })
  slug: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 30, nullable: true })
  nit: string;

  @Column({ name: 'logo_url', length: 255, nullable: true })
  logoUrl: string;

  @Column({ length: 10, default: 'COP' })
  currency: string;

  @Column({ length: 50, default: 'America/Bogota' })
  timezone: string;

  @Column({ type: 'enum', enum: ['trial', 'basic', 'pro', 'enterprise'], default: 'trial' })
  plan: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'trial_ends_at', type: 'date', nullable: true })
  trialEndsAt: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
