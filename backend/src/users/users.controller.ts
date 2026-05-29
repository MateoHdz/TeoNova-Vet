import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClinicId } from '../common/decorators/clinic.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll(@ClinicId() clinicId: number) {
    return this.service.findAll(clinicId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @ClinicId() clinicId: number) {
    return this.service.findOne(+id, clinicId);
  }

  @Post()
  @Roles('admin', 'superadmin')
  create(@Body() body: any, @ClinicId() clinicId: number) {
    return this.service.create({ ...body, clinicId });
  }

  @Put(':id')
  @Roles('admin', 'superadmin')
  update(@Param('id') id: string, @Body() body: any, @ClinicId() clinicId: number) {
    return this.service.update(+id, body, clinicId);
  }

  @Delete(':id')
  @Roles('admin', 'superadmin')
  remove(@Param('id') id: string, @ClinicId() clinicId: number) {
    return this.service.remove(+id, clinicId);
  }
}
