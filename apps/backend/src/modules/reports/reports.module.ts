import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PdfService } from './pdf.service';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PdfService],
})
export class ReportsModule {}
