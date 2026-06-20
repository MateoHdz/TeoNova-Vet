import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClinicOnlyGuard } from '../common/guards/clinic-only.guard';
import { ClinicId, CurrentUser } from '../common/decorators/clinic.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard, ClinicOnlyGuard)
export class SalesController {
  constructor(private readonly service: SalesService) {}
  
  @Get()
  findAll(
    @ClinicId() cid: number,
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('customerId') cusId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    let f = from;
    let t = to;
    if (user.role === 'employee') {
      const today = new Date().toISOString().split('T')[0];
      f = today;
      t = today;
    }
    if (page && limit) {
      return this.service.findAllPaginated(cid, f, t, cusId ? +cusId : undefined, +page, +limit);
    }
    return this.service.findAll(cid, f, t, cusId ? +cusId : undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ClinicId() cid: number, @CurrentUser() user: any) {
    const sale = await this.service.findOne(+id, cid);
    if (user.role === 'employee') {
      const today = new Date().toISOString().split('T')[0];
      const saleDate = new Date(sale.soldAt).toISOString().split('T')[0];
      if (saleDate !== today) {
        throw new ForbiddenException('No tienes permiso para ver detalles de ventas históricas');
      }
    }
    return sale;
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.service.create(body, user.userId, user.clinicId);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.role === 'employee') {
      const sale = await this.service.findOne(+id, user.clinicId);
      const today = new Date().toISOString().split('T')[0];
      const saleDate = new Date(sale.soldAt).toISOString().split('T')[0];
      if (saleDate !== today) {
        throw new ForbiddenException('No tienes permiso para cancelar ventas históricas');
      }
    }
    return this.service.cancel(+id, user.userId, user.clinicId);
  }
}
