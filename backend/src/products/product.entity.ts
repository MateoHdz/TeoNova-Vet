import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Clinic } from '../clinics/clinic.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'clinic_id', unsigned: true })
  clinicId: number;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 80, nullable: true })
  sku: string;

  @Column({ length: 80, nullable: true })
  category: string;

  @Column({ name: 'purchase_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  purchasePrice: number;

  @Column({ name: 'sale_price', type: 'decimal', precision: 10, scale: 2 })
  salePrice: number;

  /** Decimal stock supports bulk/fractional products (e.g. 12.5 kg) */
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  stock: number;

  @Column({ name: 'min_stock', type: 'decimal', precision: 10, scale: 3, default: 5 })
  minStock: number;

  /** Legacy unit field — use saleUnit for bulk products */
  @Column({ length: 30, default: 'unidad' })
  unit: string;

  /** Marks a product as bulk/weighted — sold in fractional quantities */
  @Column({ name: 'is_bulk', default: false })
  isBulk: boolean;

  /** Unit of sale for bulk products: 'kg', 'lb', 'g', 'unidad', or custom */
  @Column({ name: 'sale_unit', length: 30, default: 'unidad' })
  saleUnit: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
