import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { PdfService } from './pdf.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('apartments.csv')
  @RequirePermission('apartments:export')
  async apartments(@CurrentUser() user: JwtPayload, @Res() res: Response): Promise<void> {
    send(res, 'apartments', await this.reportsService.apartmentsCsv(user.orgId));
  }

  @Get('rent.csv')
  @RequirePermission('rent:export')
  async rent(@CurrentUser() user: JwtPayload, @Res() res: Response): Promise<void> {
    send(res, 'rent', await this.reportsService.rentCsv(user.orgId));
  }

  @Get('repairs.csv')
  @RequirePermission('repairs:export')
  async repairs(@CurrentUser() user: JwtPayload, @Res() res: Response): Promise<void> {
    send(res, 'repairs', await this.reportsService.repairsCsv(user.orgId));
  }

  @Get('payments/:id/receipt.pdf')
  @RequirePermission('rent:export')
  async paymentReceipt(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.pdfService.paymentReceipt(id, user.orgId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  }
}

// Writes the CSV directly (bypassing the {data} transform interceptor).
function send(res: Response, name: string, csv: string): void {
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${stamp}.csv"`);
  res.send(csv);
}
