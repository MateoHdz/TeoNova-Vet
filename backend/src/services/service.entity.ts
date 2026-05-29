import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Clinic } from '../clinics/clinic.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @Column({ name: 'clinic_id', unsigned: true }) clinicId: number;
  @ManyToOne(() => Clinic) @JoinColumn({ name: 'clinic_id' }) clinic: Clinic;
  @Column({ length: 100 }) name: string;
  @Column({ type: 'enum', enum: ['bath','haircut','boarding','other'] }) type: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ name: 'base_price', type: 'decimal', precision:10, scale:2, default:0 }) basePrice: number;
  @Column({ name: 'is_price_variable', default: false }) isPriceVariable: boolean;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
