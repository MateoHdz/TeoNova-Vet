import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Clinic } from '../clinics/clinic.entity';
import { User } from '../users/user.entity';

export type ExpenseCategory =
  | 'alimentacion'
  | 'transporte'
  | 'mantenimiento'
  | 'compras'
  | 'servicios'
  | 'nomina'
  | 'marketing'
  | 'otros';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'clinic_id', unsigned: true })
  clinicId: number;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({ name: 'user_id', unsigned: true, nullable: true })
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 200 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['alimentacion','transporte','mantenimiento','compras','servicios','nomina','marketing','otros'],
    default: 'otros',
  })
  category: ExpenseCategory;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
