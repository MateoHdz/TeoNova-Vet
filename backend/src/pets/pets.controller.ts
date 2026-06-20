import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PetsService } from './pets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClinicOnlyGuard } from '../common/guards/clinic-only.guard';
import { ClinicId } from '../common/decorators/clinic.decorator';

@Controller('pets')
@UseGuards(JwtAuthGuard, ClinicOnlyGuard)
export class PetsController {
  constructor(private readonly service: PetsService) {}
  @Get()
  findAll(
    @ClinicId() cid: number,
    @Query('customerId') cusId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    if (page && limit) return this.service.findAllPaginated(cid, cusId ? +cusId : undefined, search, +page, +limit);
    return this.service.findAll(cid, cusId ? +cusId : undefined, search);
  }
  @Get(':id') findOne(@Param('id') id: string, @ClinicId() cid: number) { return this.service.findOne(+id, cid); }
  @Post()   create(@Body() body: any, @ClinicId() cid: number) { return this.service.create(cid, body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any, @ClinicId() cid: number) { return this.service.update(+id, cid, body); }
  @Delete(':id') remove(@Param('id') id: string, @ClinicId() cid: number) { return this.service.remove(+id, cid); }
}
