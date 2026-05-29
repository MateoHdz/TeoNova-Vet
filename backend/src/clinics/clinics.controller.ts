import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('clinics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class ClinicsController {
  constructor(private readonly service: ClinicsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('platform-summary')
  platformSummary() { return this.service.getPlatformSummary(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(+id); }

  @Get(':id/stats')
  getStats(@Param('id') id: string) { return this.service.getStats(+id); }

  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(+id, body); }

  @Patch(':id/activate')
  activate(@Param('id') id: string) { return this.service.setStatus(+id, true); }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string) { return this.service.setStatus(+id, false); }
}
