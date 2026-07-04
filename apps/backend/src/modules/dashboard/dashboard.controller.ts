import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getSummary(user.orgId);
  }

  @Get('revenue')
  @ApiQuery({ name: 'months', required: false, type: Number })
  getRevenue(
    @CurrentUser() user: JwtPayload,
    @Query('months') months?: number,
  ) {
    return this.dashboardService.getMonthlyRevenue(user.orgId, months ?? 12);
  }

  @Get('profitability')
  getProfitability(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getApartmentProfitability(user.orgId);
  }
}
