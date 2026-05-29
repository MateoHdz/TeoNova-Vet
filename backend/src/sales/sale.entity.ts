import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Clinic } from '../clinics/clinic.entity';
import { User } from '../users/user.entity';
import { Customer } from '../customers/customer.entity';
import { Pet } from '../pets/pet.entity';
import { Product } from '../products/product.entity';
import { Service } from '../services/service.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @Column({ name:'clinic_id', unsigned:true }) clinicId: number;
  @ManyToOne(()=>Clinic) @JoinColumn({name:'clinic_id'}) clinic: Clinic;
  @Column({ name:'user_id', unsigned:true }) userId: number;
  @ManyToOne(()=>User) @JoinColumn({name:'user_id'}) user: User;
  @Column({ name:'customer_id', unsigned:true, nullable:true }) customerId: number;
  @ManyToOne(()=>Customer,{nullable:true}) @JoinColumn({name:'customer_id'}) customer: Customer;
  @Column({ name:'pet_id', unsigned:true, nullable:true }) petId: number;
  @ManyToOne(()=>Pet,{nullable:true}) @JoinColumn({name:'pet_id'}) pet: Pet;
  @Column({ name:'payment_method', type:'enum', enum:['cash','card','transfer','other'], default:'cash' }) paymentMethod: string;
  @Column({ type:'decimal', precision:10, scale:2, default:0 }) subtotal: number;
  @Column({ type:'decimal', precision:10, scale:2, default:0 }) discount: number;
  @Column({ type:'decimal', precision:10, scale:2, default:0 }) total: number;
  @Column({ type:'text', nullable:true }) notes: string;
  @Column({ type:'enum', enum:['completed','cancelled'], default:'completed' }) status: string;
  @OneToMany(()=>SaleItem, item=>item.sale, { cascade:true }) items: SaleItem[];
  @Column({ name:'sold_at', type:'timestamp', default:()=>'CURRENT_TIMESTAMP' }) soldAt: Date;
  @CreateDateColumn({ name:'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name:'updated_at' }) updatedAt: Date;
}

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn({ unsigned: true }) id: number;
  @Column({ name:'sale_id', unsigned:true }) saleId: number;
  @ManyToOne(()=>Sale, sale=>sale.items) @JoinColumn({name:'sale_id'}) sale: Sale;
  @Column({ name:'item_type', type:'enum', enum:['product','service'] }) itemType: 'product'|'service';
  @Column({ name:'product_id', unsigned:true, nullable:true }) productId: number;
  @ManyToOne(()=>Product,{nullable:true}) @JoinColumn({name:'product_id'}) product: Product;
  @Column({ name:'service_id', unsigned:true, nullable:true }) serviceId: number;
  @ManyToOne(()=>Service,{nullable:true}) @JoinColumn({name:'service_id'}) service: Service;
  @Column({ length:200 }) description: string;
  @Column({ type:'decimal', precision:10, scale:3, default:1 }) quantity: number;
  @Column({ name:'unit_price', type:'decimal', precision:10, scale:2 }) unitPrice: number;
  @Column({ name:'purchase_price', type:'decimal', precision:10, scale:2, default:0 }) purchasePrice: number;
  @Column({ name:'line_total', type:'decimal', precision:10, scale:2 }) lineTotal: number;
  @Column({ name:'service_date_start', type:'date', nullable:true }) serviceDateStart: string;
  @Column({ name:'service_date_end', type:'date', nullable:true }) serviceDateEnd: string;
  @Column({ name:'service_notes', type:'text', nullable:true }) serviceNotes: string;
}
