import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClinicOnlyGuard } from '../common/guards/clinic-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClinicId } from '../common/decorators/clinic.decorator';

@Controller('services')
@UseGuards(JwtAuthGuard, ClinicOnlyGuard)
export class ServicesController {
  constructor(private readonly service: ServicesService) {}
  @Get()    findAll(@ClinicId() cid: number) { return this.service.findAll(cid); }
  @Get(':id') findOne(@Param('id') id: string, @ClinicId() cid: number) { return this.service.findOne(+id,cid); }
  @Post()   @UseGuards(RolesGuard) @Roles('admin','superadmin') create(@Body() body: any, @ClinicId() cid: number) { return this.service.create(cid,body); }
  @Put(':id') @UseGuards(RolesGuard) @Roles('admin','superadmin') update(@Param('id') id: string, @Body() body: any, @ClinicId() cid: number) { return this.service.update(+id,cid,body); }
  @Delete(':id') @UseGuards(RolesGuard) @Roles('admin','superadmin') remove(@Param('id') id: string, @ClinicId() cid: number) { return this.service.remove(+id,cid); }
}
