import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Clinic } from '../clinics/clinic.entity';
import { Customer } from '../customers/customer.entity';

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'clinic_id', unsigned: true })
  clinicId: number;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({ name: 'customer_id', unsigned: true })
  customerId: number;

  @ManyToOne(() => Customer, c => c.pets)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, default: 'dog' })
  species: string;

  @Column({ length: 100, nullable: true })
  breed: string;

  @Column({ type: 'date', nullable: true })
  birthdate: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
