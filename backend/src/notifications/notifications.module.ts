import { Module, Controller, Get, UseGuards, Injectable } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClinicOnlyGuard } from '../common/guards/clinic-only.guard';
import { ClinicId } from '../common/decorators/clinic.decorator';
import { Product } from '../products/product.entity';
import { Sale } from '../sales/sale.entity';
import { Appointment } from '../appointments/appointment.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Product)     private productRepo:     Repository<Product>,
    @InjectRepository(Sale)        private saleRepo:        Repository<Sale>,
    @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
  ) {}

  async getAll(clinicId: number) {
    const notifications: any[] = [];
    const now      = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const [lowStock, appointments, recentSales] = await Promise.all([
      this.productRepo.createQueryBuilder('p')
        .where('p.clinicId = :c AND p.isActive = true AND p.stock <= p.minStock', { c: clinicId })
        .orderBy('p.stock', 'ASC').limit(8).getMany(),

      this.appointmentRepo.createQueryBuilder('a')
        .leftJoinAndSelect('a.customer', 'customer')
        .leftJoinAndSelect('a.pet', 'pet')
        .leftJoinAndSelect('a.service', 'service')
        .where('a.clinicId = :c AND DATE(a.scheduledAt) = :today AND a.status IN (:...s)',
          { c: clinicId, today: todayStr, s: ['pending', 'in_progress'] })
        .orderBy('a.scheduledAt', 'ASC').limit(5).getMany(),

      this.saleRepo.createQueryBuilder('s')
        .leftJoinAndSelect('s.customer', 'customer')
        .where('s.clinicId = :c AND DATE(s.soldAt) = :today AND s.status = :st',
          { c: clinicId, today: todayStr, st: 'completed' })
        .orderBy('s.soldAt', 'DESC').limit(3).getMany(),
    ]);

    lowStock.forEach(p => notifications.push({
      id: `stock-${p.id}`, type: 'stock', icon: 'package', color: '#d97706',
      title: p.stock === 0 ? `${p.name} — AGOTADO` : `${p.name} — stock bajo`,
      body: `Stock: ${p.stock} ${p.unit} (mín. ${p.minStock})`,
      time: now.toISOString(), read: false,
    }));

    appointments.forEach(a => {
      const t = new Date(a.scheduledAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      notifications.push({
        id: `appt-${a.id}`, type: 'appointment', icon: 'scissors', color: '#2563eb',
        title: `${a.service?.name || 'Servicio'} — ${a.pet?.name || 'Mascota'}`,
        body: `${a.customer?.name || 'Cliente'} · Hoy ${t}`,
        time: a.scheduledAt, read: false,
      });
    });

    recentSales.forEach(s => {
      const total = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(s.total);
      notifications.push({
        id: `sale-${s.id}`, type: 'sale', icon: 'shopping-cart', color: '#10b981',
        title: `Venta #${s.id} registrada`,
        body: `${s.customer?.name || 'Sin cliente'} · ${total}`,
        time: s.soldAt, read: true,
      });
    });

    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return { notifications, unread: notifications.filter(n => !n.read).length };
  }
}

@Controller('notifications')
@UseGuards(JwtAuthGuard, ClinicOnlyGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  getAll(@ClinicId() clinicId: number) {
    return this.service.getAll(clinicId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Product, Sale, Appointment])],
  providers: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
