import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClinicId } from '../common/decorators/clinic.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // ── Clinic-scoped endpoints (admin) ──────────────────────────────
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
  create(@Body() body: CreateUserDto, @ClinicId() clinicId: number) {
    return this.service.create({ ...body, clinicId });
  }

  @Put(':id')
  @Roles('admin', 'superadmin')
  update(@Param('id') id: string, @Body() body: UpdateUserDto, @ClinicId() clinicId: number) {
    return this.service.update(+id, body, clinicId);
  }

  @Delete(':id')
  @Roles('admin', 'superadmin')
  remove(@Param('id') id: string, @ClinicId() clinicId: number) {
    return this.service.remove(+id, clinicId);
  }

  // ── Superadmin-only endpoints ─────────────────────────────────────
  @Get('global/all')
  @Roles('superadmin')
  findAllGlobal() {
    return this.service.findAllGlobal();
  }

  @Patch(':id/password')
  @Roles('superadmin')
  resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.service.resetPassword(+id, body.password);
  }

  @Delete(':id/permanent')
  @Roles('superadmin')
  permanentDelete(@Param('id') id: string) {
    return this.service.permanentDelete(+id);
  }
}
