import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClinicOnlyGuard } from '../common/guards/clinic-only.guard';
import { ClinicId, CurrentUser } from '../common/decorators/clinic.decorator';
import { AppointmentStatus } from './appointment.entity';

@Controller('appointments')
@UseGuards(JwtAuthGuard, ClinicOnlyGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}
  @Get()              findAll(@ClinicId() cid: number, @Query('from') from?: string, @Query('to') to?: string, @Query('status') status?: AppointmentStatus) { return this.service.findAll(cid,from,to,status); }
  @Get('today-summary') todaySummary(@ClinicId() cid: number, @Query('from') from?: string, @Query('to') to?: string) { return this.service.getTodaySummary(cid, from, to); }
  @Get(':id')         findOne(@Param('id') id: string, @ClinicId() cid: number) { return this.service.findOne(+id,cid); }
  @Post()             create(@Body() body: any, @CurrentUser() user: any) { return this.service.create(body,user.userId,user.clinicId); }
  @Put(':id')         update(@Param('id') id: string, @Body() body: any, @ClinicId() cid: number) { return this.service.update(+id,cid,body); }
  @Patch(':id/status') updateStatus(@Param('id') id: string, @Body('status') status: AppointmentStatus, @ClinicId() cid: number, @CurrentUser() user: any) { return this.service.updateStatus(+id,cid,status,user.userId); }
  @Delete(':id')      remove(@Param('id') id: string, @ClinicId() cid: number) { return this.service.remove(+id,cid); }
}
