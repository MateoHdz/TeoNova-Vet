import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn({ unsigned:true }) id: number;
  @Column({ name:'clinic_id', unsigned:true }) clinicId: number;
  @Column({ name:'product_id', unsigned:true }) productId: number;
  @ManyToOne(()=>Product) @JoinColumn({name:'product_id'}) product: Product;
  @Column({ name:'user_id', unsigned:true, nullable:true }) userId: number;
  @Column({ name:'sale_id', unsigned:true, nullable:true }) saleId: number;
  @Column({ type:'enum', enum:['in','out','adjustment'] }) type: 'in'|'out'|'adjustment';
  @Column({ type:'int' }) quantity: number;
  @Column({ name:'stock_before', type:'int' }) stockBefore: number;
  @Column({ name:'stock_after', type:'int' }) stockAfter: number;
  @Column({ length:255, nullable:true }) notes: string;
  @CreateDateColumn({ name:'created_at' }) createdAt: Date;
}
