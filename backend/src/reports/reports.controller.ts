import {
  Controller, Get, Query, UseGuards, Res, Header, ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClinicOnlyGuard } from '../common/guards/clinic-only.guard';
import { ClinicId, CurrentUser } from '../common/decorators/clinic.decorator';
import { ExcelService } from './excel.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, ClinicOnlyGuard, RolesGuard)
@Roles('admin', 'employee')
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
    private readonly excel:   ExcelService,
  ) {}

  private today() { return new Date().toISOString().split('T')[0]; }

  @Get('summary')
  summary(@ClinicId() cid: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getSalesSummary(cid, from || this.today(), to || this.today());
  }

  @Get('sales-by-day')
  byDay(@ClinicId() cid: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getSalesByDay(cid, from || this.today(), to || this.today());
  }

  @Get('movements')
  async movements(
    @ClinicId() cid: number,
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    let f = from;
    let t = to;
    
    // Workers are only allowed to see today's movements
    if (user.role === 'employee') {
      const today = this.today();
      f = today;
      t = today;
    }
    
    return this.service.getUnifiedMovements(
      cid, 
      f || this.today(), 
      t || this.today(), 
      type, 
      userId ? +userId : undefined, 
      paymentMethod
    );
  }

  @Get('top-products')
  topProducts(
    @ClinicId() cid: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getTopProducts(cid, from || this.today(), to || this.today(), limit ? +limit : 10);
  }

  @Get('top-services')
  topServices(@ClinicId() cid: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getTopServices(cid, from || this.today(), to || this.today());
  }

  @Get('payment-methods')
  paymentMethods(@ClinicId() cid: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getPaymentBreakdown(cid, from || this.today(), to || this.today());
  }

  @Get('low-stock')
  lowStock(@ClinicId() cid: number) {
    return this.service.getLowStock(cid);
  }

  @Get('export/excel')
  @Roles('admin')
  async exportExcel(
    @ClinicId() cid: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const today = this.today();
    const data  = await this.service.getFullReport(cid, from || today, to || today);
    const buffer = await this.excel.generateReport(data);
    const filename = `reporte-vetpos-${from || today}-${to || today}.xlsx`;
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buffer.length,
    });
    res.send(buffer);
  }
}
