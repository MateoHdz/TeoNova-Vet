import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';
import { Clinic } from './clinic.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Clinic, User])],
  providers: [ClinicsService],
  controllers: [ClinicsController],
  exports: [ClinicsService],
})
export class ClinicsModule {}
