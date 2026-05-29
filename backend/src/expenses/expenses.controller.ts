import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClinicOnlyGuard } from '../common/guards/clinic-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClinicId, CurrentUser } from '../common/decorators/clinic.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, ClinicOnlyGuard)
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  findAll(
    @ClinicId() cid: number,
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('category') category?: string,
  ) {
    let f = from;
    let t = to;
    if (user.role === 'employee') {
      const today = new Date().toISOString().split('T')[0];
      f = today;
      t = today;
    }
    return this.service.findAll(cid, f, t, category);
  }

  @Get('summary')
  summary(
    @ClinicId() cid: number,
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    let f = from;
    let t = to;
    if (user.role === 'employee') {
      const today = new Date().toISOString().split('T')[0];
      f = today;
      t = today;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return this.service.getSummary(cid, f || todayStr, t || todayStr);
  }

  @Get('by-day')
  byDay(
    @ClinicId() cid: number,
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    let f = from;
    let t = to;
    if (user.role === 'employee') {
      const today = new Date().toISOString().split('T')[0];
      f = today;
      t = today;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return this.service.getByDay(cid, f || todayStr, t || todayStr);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ClinicId() cid: number, @CurrentUser() user: any) {
    const e = await this.service.findOne(+id, cid);
    if (user.role === 'employee') {
      const today = new Date().toISOString().split('T')[0];
      if (e.date !== today) {
        throw new ForbiddenException('No tienes permiso para ver gastos históricos');
      }
    }
    return e;
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.service.create(body, user.userId, user.clinicId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @ClinicId() cid: number,
    @CurrentUser() user: any,
  ) {
    if (user.role === 'employee') {
      const e = await this.service.findOne(+id, cid);
      const today = new Date().toISOString().split('T')[0];
      if (e.date !== today) {
        throw new ForbiddenException('No tienes permiso para modificar gastos históricos');
      }
    }
    return this.service.update(+id, body, cid);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string, @ClinicId() cid: number) {
    return this.service.remove(+id, cid);
  }
}
