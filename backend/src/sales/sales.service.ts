import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale, SaleItem } from './sale.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)     private saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private itemRepo: Repository<SaleItem>,
    private productsService: ProductsService,
    private dataSource: DataSource,
  ) {}

  findAll(clinicId: number, from?: string, to?: string, customerId?: number): Promise<Sale[]> {
    const qb = this.saleRepo.createQueryBuilder('sale')
      .leftJoinAndSelect('sale.customer','customer')
      .leftJoinAndSelect('sale.pet','pet')
      .leftJoinAndSelect('sale.user','user')
      .leftJoinAndSelect('sale.items','items')
      .where('sale.clinicId = :clinicId AND sale.status = :status', { clinicId, status:'completed' })
      .orderBy('sale.soldAt','DESC');
    if (from && to) qb.andWhere('sale.soldAt BETWEEN :from AND :to', { from: new Date(from), to: new Date(to+'T23:59:59') });
    if (customerId) qb.andWhere('sale.customerId = :customerId', { customerId });
    return qb.getMany();
  }

  async findOne(id: number, clinicId: number): Promise<Sale> {
    const sale = await this.saleRepo.findOne({
      where: { id, clinicId },
      relations: ['customer','pet','user','items','items.product','items.service'],
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async create(dto: any, userId: number, clinicId: number): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      // Validate stock with row locks
      for (const item of dto.items) {
        if (item.itemType === 'product' && item.productId) {
          const product = await manager.getRepository('products').findOne({
            where: { id: item.productId, clinicId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product) throw new NotFoundException(`Producto no encontrado`);
          if (product.stock < item.quantity)
            throw new BadRequestException(`Stock insuficiente para "${product.name}" (disponible: ${product.stock})`);
        }
      }

      const saleItems = dto.items.map((item: any) => ({
        itemType:         item.itemType,
        productId:        item.productId  || null,
        serviceId:        item.serviceId  || null,
        description:      item.description,
        quantity:         Number(item.quantity),
        unitPrice:        Number(item.unitPrice),
        purchasePrice:    Number(item.purchasePrice || 0),
        lineTotal:        Number(item.quantity) * Number(item.unitPrice),
        serviceDateStart: item.serviceDateStart || null,
        serviceDateEnd:   item.serviceDateEnd   || null,
        serviceNotes:     item.serviceNotes     || null,
      }));

      const subtotal = saleItems.reduce((s: number, i: any) => s + Number(i.lineTotal), 0);
      const discount = Number(dto.discount || 0);

      const sale = manager.create(Sale, {
        clinicId,
        userId,
        customerId:    dto.customerId    || null,
        petId:         dto.petId         || null,
        paymentMethod: dto.paymentMethod || 'cash',
        subtotal, discount, total: subtotal - discount,
        notes: dto.notes || null,
        status: 'completed',
        soldAt: new Date(),
        items: saleItems as SaleItem[],
      });
      const saved = await manager.save(Sale, sale);

      // Deduct stock in same transaction
      for (const item of dto.items) {
        if (item.itemType === 'product' && item.productId) {
          await this.productsService.adjustStock(
            item.productId, Number(item.quantity), 'out', userId,
            `Venta #${saved.id}`, saved.id, manager, clinicId,
          );
        }
      }

      return manager.findOne(Sale, {
        where: { id: saved.id },
        relations: ['customer','pet','user','items','items.product','items.service'],
      });
    });
  }

  async cancel(id: number, userId: number, clinicId: number): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(Sale, { where: { id, clinicId }, relations: ['items'] });
      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.status === 'cancelled') throw new BadRequestException('La venta ya está cancelada');
      for (const item of sale.items) {
        if (item.itemType === 'product' && item.productId) {
          await this.productsService.adjustStock(
            item.productId, Number(item.quantity), 'in', userId,
            `Cancelación venta #${id}`, undefined, manager, clinicId,
          );
        }
      }
      sale.status = 'cancelled';
      return manager.save(Sale, sale);
    });
  }

  async hasSaleForAppointment(clinicId: number, appointmentId: number): Promise<boolean> {
    const noteSearch = `Cita #${appointmentId}`;
    const count = await this.saleRepo.createQueryBuilder('sale')
      .where('sale.clinicId = :clinicId AND sale.notes LIKE :note', { clinicId, note: `%${noteSearch}%` })
      .getCount();
    return count > 0;
  }
}
