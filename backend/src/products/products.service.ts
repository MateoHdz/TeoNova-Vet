import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, EntityManager, DataSource } from 'typeorm';
import { Product } from './product.entity';
import { StockMovement } from './stock-movement.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private repo: Repository<Product>,
    @InjectRepository(StockMovement) private movRepo: Repository<StockMovement>,
    private dataSource: DataSource,
  ) {}

  findAll(clinicId: number, search?: string, lowStock?: boolean): Promise<Product[]> {
    if (lowStock) {
      return this.repo.createQueryBuilder('p')
        .where('p.clinicId = :clinicId AND p.isActive = true AND p.stock <= p.minStock', { clinicId })
        .orderBy('p.stock', 'ASC').getMany();
    }
    const where: any = { clinicId, isActive: true };
    if (search) where.name = Like(`%${search}%`);
    return this.repo.find({ where, order: { name: 'ASC' } });
  }

  async findOne(id: number, clinicId?: number, manager?: EntityManager): Promise<Product> {
    const repo = manager ? manager.getRepository(Product) : this.repo;
    const where: any = { id };
    if (clinicId) where.clinicId = clinicId;
    const p = await repo.findOne({ where });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  create(clinicId: number, data: Partial<Product>): Promise<Product> {
    return this.repo.save(this.repo.create({ ...data, clinicId }));
  }

  async update(id: number, clinicId: number, data: Partial<Product>): Promise<Product> {
    const p = await this.findOne(id, clinicId);
    Object.assign(p, data);
    return this.repo.save(p);
  }

  async remove(id: number, clinicId: number): Promise<void> {
    const p = await this.findOne(id, clinicId);
    p.isActive = false;
    await this.repo.save(p);
  }

  /**
   * Adjusts stock for a product.
   * When called from the controller (without a manager), wraps in its own transaction
   * so the pessimistic_write lock works correctly in MySQL.
   * When called from another service (with a manager/transaction), uses that transaction.
   */
  async adjustStock(
    productId: number,
    quantity: number,
    type: 'in' | 'out' | 'adjustment',
    userId: number,
    notes?: string,
    saleId?: number,
    manager?: EntityManager,
    clinicId?: number,
    newPurchasePrice?: number,
    newSalePrice?: number,
  ): Promise<Product> {
    // If called with an external manager (e.g. from SalesService), use it directly
    if (manager) {
      return this._doAdjust(manager, productId, quantity, type, userId, notes, saleId, newPurchasePrice, newSalePrice);
    }
    // Otherwise wrap in a transaction so pessimistic_write works in MySQL
    return this.dataSource.transaction(async (txManager) => {
      return this._doAdjust(txManager, productId, quantity, type, userId, notes, saleId, newPurchasePrice, newSalePrice);
    });
  }

  private async _doAdjust(
    manager: EntityManager,
    productId: number,
    quantity: number,
    type: 'in' | 'out' | 'adjustment',
    userId: number,
    notes?: string,
    saleId?: number,
    newPurchasePrice?: number,
    newSalePrice?: number,
  ): Promise<Product> {
    const productRepo = manager.getRepository(Product);
    const movRepo     = manager.getRepository(StockMovement);

    const product = await productRepo.findOne({
      where: { id: productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    if (type === 'out' && product.stock < quantity) {
      throw new BadRequestException(
        `Stock insuficiente para "${product.name}" (disponible: ${product.stock})`,
      );
    }

    const stockBefore = Number(product.stock);
    const qty = Number(quantity);
    
    let newStock = stockBefore;
    if (type === 'in')         newStock += qty;
    else if (type === 'out')   newStock -= qty;
    else                       newStock  = qty;
    
    product.stock = newStock;

    // Update prices if provided (only meaningful for 'in' entries)
    if (type === 'in') {
      if (newPurchasePrice !== undefined && newPurchasePrice > 0) {
        product.purchasePrice = newPurchasePrice;
      }
      if (newSalePrice !== undefined && newSalePrice > 0) {
        product.salePrice = newSalePrice;
      }
    }

    await productRepo.save(product);
    await movRepo.save(movRepo.create({
      clinicId: product.clinicId,
      productId, userId, saleId, type, quantity,
      stockBefore, stockAfter: product.stock, notes,
    }));
    return product;
  }

  getLowStock(clinicId: number): Promise<Product[]> {
    return this.repo.createQueryBuilder('p')
      .where('p.clinicId = :clinicId AND p.isActive = true AND p.stock <= p.minStock', { clinicId })
      .orderBy('p.stock', 'ASC').getMany();
  }
}
