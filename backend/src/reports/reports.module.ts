import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ExcelService } from './excel.service';
import { Sale, SaleItem } from '../sales/sale.entity';
import { Product } from '../products/product.entity';
import { Expense } from '../expenses/expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, Product, Expense])],
  providers: [ReportsService, ExcelService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
