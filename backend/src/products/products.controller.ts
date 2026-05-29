import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClinicOnlyGuard } from '../common/guards/clinic-only.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClinicId, CurrentUser } from '../common/decorators/clinic.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, ClinicOnlyGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  findAll(@ClinicId() cid: number, @Query('search') s?: string, @Query('lowStock') ls?: string) {
    return this.service.findAll(cid, s, ls === 'true');
  }
  @Get('low-stock')
  getLowStock(@ClinicId() cid: number) { return this.service.getLowStock(cid); }
  @Get(':id')
  findOne(@Param('id') id: string, @ClinicId() cid: number) { return this.service.findOne(+id, cid); }
  @Post()
  @UseGuards(RolesGuard) @Roles('admin','superadmin')
  create(@Body() body: any, @ClinicId() cid: number) { return this.service.create(cid, body); }
  @Put(':id')
  @UseGuards(RolesGuard) @Roles('admin','superadmin')
  update(@Param('id') id: string, @Body() body: any, @ClinicId() cid: number) { return this.service.update(+id, cid, body); }
  @Post(':id/stock')
  adjustStock(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.service.adjustStock(+id, body.quantity, body.type, user.userId, body.notes, undefined, undefined, user.clinicId);
  }
  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('admin','superadmin')
  remove(@Param('id') id: string, @ClinicId() cid: number) { return this.service.remove(+id, cid); }
}
