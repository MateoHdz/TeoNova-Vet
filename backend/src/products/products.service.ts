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

  findAll(clinicId: number, search?: string, lowStock?: boolean, category?: string): Promise<Product[]> {
    if (lowStock) {
      return this.repo.createQueryBuilder('p')
        .where('p.clinicId = :clinicId AND p.isActive = true AND p.stock <= p.minStock', { clinicId })
        .orderBy('p.stock', 'ASC').getMany();
    }
    const where: any = { clinicId, isActive: true };
    if (search) where.name = Like(`%${search}%`);
    if (category && category !== 'Todas') where.category = category;
    return this.repo.find({ where, order: { name: 'ASC' } });
  }

  async findAllPaginated(clinicId: number, search: string | undefined, lowStock: boolean | undefined, category: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    if (lowStock) {
      const qb = this.repo.createQueryBuilder('p')
        .where('p.clinicId = :clinicId AND p.isActive = true AND p.stock <= p.minStock', { clinicId });
      if (category && category !== 'Todas') qb.andWhere('p.category = :category', { category });
      const [data, total] = await qb
        .orderBy('p.stock', 'ASC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();
      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    const where: any = { clinicId, isActive: true };
    if (search) where.name = Like(`%${search}%`);
    if (category && category !== 'Todas') where.category = category;
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { name: 'ASC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  async getSummary(clinicId: number) {
    const result = await this.repo.createQueryBuilder('p')
      .select('COUNT(p.id)', 'totalSKUs')
      .addSelect('SUM(p.purchasePrice * p.stock)', 'totalPurchaseValuation')
      .addSelect('SUM(p.salePrice * p.stock)', 'totalSaleValuation')
      .addSelect('SUM(CASE WHEN p.stock > 0 AND p.stock <= p.minStock THEN 1 ELSE 0 END)', 'lowStockCount')
      .addSelect('SUM(CASE WHEN p.stock <= 0 THEN 1 ELSE 0 END)', 'outOfStockCount')
      .where('p.clinicId = :clinicId AND p.isActive = true', { clinicId })
      .getRawOne();
      
    return {
      totalSKUs: Number(result.totalSKUs || 0),
      totalPurchaseValuation: Number(result.totalPurchaseValuation || 0),
      totalSaleValuation: Number(result.totalSaleValuation || 0),
      lowStockCount: Number(result.lowStockCount || 0),
      outOfStockCount: Number(result.outOfStockCount || 0)
    };
  }
}
