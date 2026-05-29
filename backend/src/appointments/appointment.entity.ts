import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Clinic } from '../clinics/clinic.entity';
import { Customer } from '../customers/customer.entity';
import { Pet } from '../pets/pet.entity';
import { Service } from '../services/service.entity';
import { User } from '../users/user.entity';

export type AppointmentStatus = 'pending'|'in_progress'|'bath'|'cut'|'done'|'delivered'|'cancelled';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn({ unsigned:true }) id: number;
  @Column({ name:'clinic_id', unsigned:true }) clinicId: number;
  @ManyToOne(()=>Clinic) @JoinColumn({name:'clinic_id'}) clinic: Clinic;
  @Column({ name:'customer_id', unsigned:true, nullable:true }) customerId: number;
  @ManyToOne(()=>Customer,{nullable:true}) @JoinColumn({name:'customer_id'}) customer: Customer;
  @Column({ name:'pet_id', unsigned:true, nullable:true }) petId: number;
  @ManyToOne(()=>Pet,{nullable:true}) @JoinColumn({name:'pet_id'}) pet: Pet;
  @Column({ name:'service_id', unsigned:true, nullable:true }) serviceId: number;
  @ManyToOne(()=>Service,{nullable:true}) @JoinColumn({name:'service_id'}) service: Service;
  @Column({ name:'user_id', unsigned:true, nullable:true }) userId: number;
  @ManyToOne(()=>User,{nullable:true}) @JoinColumn({name:'user_id'}) user: User;
  @Column({ name:'scheduled_at', type:'datetime' }) scheduledAt: Date;
  @Column({ type:'decimal', precision:10, scale:2, default:0 }) price: number;
  @Column({ type:'text', nullable:true }) notes: string;
  @Column({ type:'enum', enum:['pending','in_progress','bath','cut','done','delivered','cancelled'], default:'pending' }) status: AppointmentStatus;
  @CreateDateColumn({ name:'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name:'updated_at' }) updatedAt: Date;
}
