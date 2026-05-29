import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Clinic } from '../clinics/clinic.entity';
import { Pet } from '../pets/pet.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'clinic_id', unsigned: true })
  clinicId: number;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Pet, (pet) => pet.customer)
  pets: Pet[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
