import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale, SaleItem } from '../sales/sale.entity';
import { Product } from '../products/product.entity';
import { Expense } from '../expenses/expense.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale)     private saleRepo:    Repository<Sale>,
    @InjectRepository(SaleItem) private itemRepo:    Repository<SaleItem>,
    @InjectRepository(Product)  private productRepo: Repository<Product>,
    @InjectRepository(Expense)  private expenseRepo: Repository<Expense>,
    private config: ConfigService,
  ) {}

  /** true mientras sold_at se guardó con sesión UTC (+00:00) leyendo hora CO como UTC */
  private useLegacyUtcClock(): boolean {
    return this.config.get('SOLD_AT_LEGACY_UTC_CLOCK', 'true') === 'true';
  }

  // ── Helpers ───────────────────────────────────────────────
  private toDateStr(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') return d.slice(0, 10);
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return String(d).slice(0, 10);
    const pad = (n: number) => String(n).padStart(2, '0');
    const legacy = this.useLegacyUtcClock();
    const y = legacy ? date.getUTCFullYear() : date.getFullYear();
    const mo = legacy ? date.getUTCMonth() + 1 : date.getMonth() + 1;
    const day = legacy ? date.getUTCDate() : date.getDate();
    return `${y}-${pad(mo)}-${pad(day)}`;
  }

  /** ISO sin zona (hora de pared) para que el frontend no aplique offset extra */
  private toLocalISO(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const legacy = this.useLegacyUtcClock();
    const y = legacy ? d.getUTCFullYear() : d.getFullYear();
    const mo = legacy ? d.getUTCMonth() + 1 : d.getMonth() + 1;
    const day = legacy ? d.getUTCDate() : d.getDate();
    const h = legacy ? d.getUTCHours() : d.getHours();
    const mi = legacy ? d.getUTCMinutes() : d.getMinutes();
    const s = legacy ? d.getUTCSeconds() : d.getSeconds();
    return `${y}-${pad(mo)}-${pad(day)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
  }

  private toNumber(v: any): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  private dateRange(from: string, to: string) {
    // End of day for the "to" date — handles timezone safely
    return {
      from: `${from} 00:00:00`,
      to:   `${to} 23:59:59`,
    };
  }

  // ── Summary: revenue + profit + expenses ─────────────────
  async getSalesSummary(clinicId: number, from: string, to: string) {
    const { from: f, to: t } = this.dateRange(from, to);

    const [rev, profit, expenses] = await Promise.all([
      this.saleRepo
        .createQueryBuilder('s')
        .select([
          'COUNT(s.id) AS totalSales',
          'COALESCE(SUM(s.total), 0) AS totalRevenue',
          'COALESCE(SUM(s.discount), 0) AS totalDiscounts',
        ].join(', '))
        .where(`s.clinic_id = :c AND s.status = 'completed' AND s.sold_at BETWEEN :f AND :t`, { c: clinicId, f, t })
        .getRawOne(),

      this.itemRepo
        .createQueryBuilder('i')
        .innerJoin('i.sale', 's')
        .select('COALESCE(SUM((i.unit_price - i.purchase_price) * i.quantity), 0) AS totalProfit')
        .where(`s.clinic_id = :c AND s.status = 'completed' AND s.sold_at BETWEEN :f AND :t`, { c: clinicId, f, t })
        .getRawOne(),

      this.expenseRepo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount), 0) AS totalExpenses')
        .where(`e.clinic_id = :c AND e.date BETWEEN :from AND :to`, { c: clinicId, from, to })
        .getRawOne(),
    ]);

    const totalRevenue  = this.toNumber(rev.totalRevenue);
    const totalProfit   = this.toNumber(profit.totalProfit);
    const totalExpenses = this.toNumber(expenses.totalExpenses);

    return {
      totalSales:      this.toNumber(rev.totalSales),
      totalRevenue,
      totalDiscounts:  this.toNumber(rev.totalDiscounts),
      totalProfit,
      totalExpenses,
      netProfit:       totalProfit - totalExpenses,
    };
  }

  // ── Sales by day: returns properly formatted date strings ─
  async getSalesByDay(clinicId: number, from: string, to: string) {
    const { from: f, to: t } = this.dateRange(from, to);

    const rows = await this.saleRepo
      .createQueryBuilder('s')
      .select([
        'DATE(s.sold_at) AS date',
        'COUNT(s.id) AS count',
        'COALESCE(SUM(s.total), 0) AS revenue',
        'COALESCE(SUM(s.discount), 0) AS discounts',
      ].join(', '))
      .where(`s.clinic_id = :c AND s.status = 'completed' AND s.sold_at BETWEEN :f AND :t`, { c: clinicId, f, t })
      .groupBy('DATE(s.sold_at)')
      .orderBy('DATE(s.sold_at)', 'ASC')
      .getRawMany();

    // Get expenses by day in same range
    const expRows = await this.expenseRepo
      .createQueryBuilder('e')
      .select(['e.date AS date', 'COALESCE(SUM(e.amount), 0) AS expenses'].join(', '))
      .where(`e.clinic_id = :c AND e.date BETWEEN :from AND :to`, { c: clinicId, from, to })
      .groupBy('e.date')
      .getRawMany();

    const expenseMap = new Map(expRows.map(r => [this.toDateStr(r.date), this.toNumber(r.expenses)]));

    return rows.map(r => ({
      date:      this.toDateStr(r.date),        // always 'YYYY-MM-DD' string
      count:     this.toNumber(r.count),
      revenue:   this.toNumber(r.revenue),
      discounts: this.toNumber(r.discounts),
      expenses:  expenseMap.get(this.toDateStr(r.date)) || 0,
    }));
  }

  // ── Top products / services ───────────────────────────────
  async getTopProducts(clinicId: number, from: string, to: string, limit = 10) {
    const { from: f, to: t } = this.dateRange(from, to);

    const rows = await this.itemRepo
      .createQueryBuilder('i')
      .innerJoin('i.sale', 's')
      .select([
        'i.description AS name',
        'i.item_type AS type',
        'COALESCE(SUM(i.quantity), 0) AS totalQty',
        'COALESCE(SUM(i.line_total), 0) AS totalRevenue',
        'COALESCE(SUM((i.unit_price - i.purchase_price) * i.quantity), 0) AS totalProfit',
      ].join(', '))
      .where(`s.clinic_id = :c AND s.status = 'completed' AND s.sold_at BETWEEN :f AND :t`, { c: clinicId, f, t })
      .groupBy('i.description, i.item_type')
      .orderBy('SUM(i.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map(r => ({
      name:         r.name,
      type:         r.type,
      totalQty:     this.toNumber(r.totalQty),
      totalRevenue: this.toNumber(r.totalRevenue),
      totalProfit:  this.toNumber(r.totalProfit),
    }));
  }

  async getTopServices(clinicId: number, from: string, to: string) {
    const { from: f, to: t } = this.dateRange(from, to);

    const rows = await this.itemRepo
      .createQueryBuilder('i')
      .innerJoin('i.sale', 's')
      .select([
        'i.description AS name',
        'COUNT(i.id) AS count',
        'COALESCE(SUM(i.line_total), 0) AS totalRevenue',
      ].join(', '))
      .where(`s.clinic_id = :c AND s.status = 'completed' AND i.item_type = 'service' AND s.sold_at BETWEEN :f AND :t`, { c: clinicId, f, t })
      .groupBy('i.description')
      .orderBy('COUNT(i.id)', 'DESC')
      .getRawMany();

    return rows.map(r => ({
      name:         r.name,
      count:        this.toNumber(r.count),
      totalRevenue: this.toNumber(r.totalRevenue),
    }));
  }

  // ── Payment method breakdown ──────────────────────────────
  async getPaymentBreakdown(clinicId: number, from: string, to: string) {
    const { from: f, to: t } = this.dateRange(from, to);

    const rows = await this.saleRepo
      .createQueryBuilder('s')
      .select([
        's.payment_method AS method',
        'COUNT(s.id) AS count',
        'COALESCE(SUM(s.total), 0) AS total',
      ].join(', '))
      .where(`s.clinic_id = :c AND s.status = 'completed' AND s.sold_at BETWEEN :f AND :t`, { c: clinicId, f, t })
      .groupBy('s.payment_method')
      .getRawMany();

    return rows.map(r => ({
      method: r.method,
      count:  this.toNumber(r.count),
      total:  this.toNumber(r.total),
    }));
  }

  // ── Low stock alert ───────────────────────────────────────
  getLowStock(clinicId: number) {
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.clinic_id = :c AND p.is_active = 1 AND p.stock <= p.min_stock', { c: clinicId })
      .orderBy('p.stock', 'ASC')
      .getMany();
  }

  // ── Unified financial movements ────────────────────────────
  async getUnifiedMovements(clinicId: number, from: string, to: string, type?: string, userId?: number, paymentMethod?: string) {
    const { from: f, to: t } = this.dateRange(from, to);

    // 1. Fetch sales
    const salesQuery = this.saleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.customer', 'customer')
      .leftJoinAndSelect('s.user', 'user')
      .leftJoinAndSelect('s.items', 'items')
      .where(`s.clinic_id = :c AND s.status = 'completed' AND s.sold_at BETWEEN :f AND :t`, { c: clinicId, f, t });

    if (userId) {
      salesQuery.andWhere('s.user_id = :userId', { userId });
    }
    if (paymentMethod) {
      salesQuery.andWhere('s.payment_method = :paymentMethod', { paymentMethod });
    }

    // 2. Fetch expenses
    const expensesQuery = this.expenseRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .where(`e.clinic_id = :c AND e.date BETWEEN :from AND :to`, { c: clinicId, from, to });

    if (userId) {
      expensesQuery.andWhere('e.user_id = :userId', { userId });
    }

    const [sales, expenses] = await Promise.all([
      salesQuery.orderBy('s.sold_at', 'DESC').getMany(),
      expensesQuery.orderBy('e.date', 'DESC').getMany(),
    ]);

    // 3. Map Sales into Movement interface
    const saleMovements = sales.map(s => {
      const soldAtDate = s.soldAt instanceof Date ? s.soldAt : new Date(s.soldAt);
      const dateStr = this.toDateStr(s.soldAt);
      const soldAtISO = this.toLocalISO(soldAtDate);
      const itemsList = s.items && s.items.length > 0
        ? s.items.map(i => `${i.description} (x${Math.round(i.quantity)})`).join(', ')
        : 'Sin artículos';
      return {
        id: `sale-${s.id}`,
        originalId: s.id,
        date: dateStr,
        soldAtISO,          // Full ISO 8601 timestamp for accurate local time rendering
        type: 'venta',
        description: `Cliente: ${s.customer?.name || 'Cliente general'} (${itemsList})`,
        category: 'Venta',
        paymentMethod: s.paymentMethod,
        entry: this.toNumber(s.total),
        exit: 0,
        user: s.user?.name || 'Sistema',
        notes: s.notes || '',
      };
    });

    // 4. Map Expenses into Movement interface
    const expenseMovements = expenses.map(e => {
      const dateStr = this.toDateStr(e.date);
      const createdAtDate = e.createdAt instanceof Date ? e.createdAt : new Date(e.createdAt);
      const createdAtISO = this.toLocalISO(createdAtDate);
      return {
        id: `expense-${e.id}`,
        originalId: e.id,
        date: dateStr,
        soldAtISO: createdAtISO,  // Same field name for uniform frontend handling
        type: 'gasto',
        description: e.description,
        category: e.category,
        paymentMethod: 'cash',
        entry: 0,
        exit: this.toNumber(e.amount),
        user: e.user?.name || 'Sistema',
        notes: e.notes || '',
      };
    });

    // 5. Combine and filter
    let combined = [...saleMovements, ...expenseMovements];
    
    if (type === 'income') {
      combined = combined.filter(m => m.entry > 0);
    } else if (type === 'expense') {
      combined = combined.filter(m => m.exit > 0);
    }
    
    if (paymentMethod) {
      combined = combined.filter(m => m.paymentMethod === paymentMethod);
    }

    // Sort by soldAtISO DESC (most recent first)
    combined.sort((a, b) => {
      const tsA = a.soldAtISO || `${a.date}T00:00:00Z`;
      const tsB = b.soldAtISO || `${b.date}T00:00:00Z`;
      return tsB.localeCompare(tsA);
    });

    return combined;
  }

  // ── Full report for Excel export ─────────────────────────
  async getFullReport(clinicId: number, from: string, to: string) {
    const { from: f, to: t } = this.dateRange(from, to);

    const [summary, salesByDay, topProducts, topServices, paymentMethods, expenses, sales] =
      await Promise.all([
        this.getSalesSummary(clinicId, from, to),
        this.getSalesByDay(clinicId, from, to),
        this.getTopProducts(clinicId, from, to, 20),
        this.getTopServices(clinicId, from, to),
        this.getPaymentBreakdown(clinicId, from, to),
        this.expenseRepo
          .createQueryBuilder('e')
          .leftJoinAndSelect('e.user', 'user')
          .where(`e.clinic_id = :c AND e.date BETWEEN :from AND :to`, { c: clinicId, from, to })
          .orderBy('e.date', 'DESC')
          .getMany(),
        this.saleRepo
          .createQueryBuilder('s')
          .leftJoinAndSelect('s.customer', 'customer')
          .leftJoinAndSelect('s.user', 'user')
          .leftJoinAndSelect('s.items', 'items')
          .where(`s.clinic_id = :c AND s.status = 'completed' AND s.sold_at BETWEEN :f AND :t`, { c: clinicId, f, t })
          .orderBy('s.sold_at', 'DESC')
          .getMany(),
      ]);

    return { summary, salesByDay, topProducts, topServices, paymentMethods, expenses, sales, from, to };
  }
}
