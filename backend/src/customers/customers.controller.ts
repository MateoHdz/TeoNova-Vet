import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClinicOnlyGuard } from '../common/guards/clinic-only.guard';
import { ClinicId } from '../common/decorators/clinic.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, ClinicOnlyGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}
  @Get()    findAll(@ClinicId() cid: number, @Query('search') s?: string) { return this.service.findAll(cid, s); }
  @Get(':id') findOne(@Param('id') id: string, @ClinicId() cid: number) { return this.service.findOne(+id, cid); }
  @Post()   create(@Body() body: any, @ClinicId() cid: number) { return this.service.create(cid, body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any, @ClinicId() cid: number) { return this.service.update(+id, cid, body); }
  @Delete(':id') remove(@Param('id') id: string, @ClinicId() cid: number) { return this.service.remove(+id, cid); }
}
