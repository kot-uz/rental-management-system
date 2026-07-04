import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RentService } from './rent.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('rent')
@ApiBearerAuth()
@Controller('rent')
export class RentController {
  constructor(private readonly rentService: RentService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return this.rentService.findByOrg(user.orgId, status);
  }

  @Get('overdue')
  getOverdue(@CurrentUser() user: JwtPayload) {
    return this.rentService.getOverdue(user.orgId);
  }

  @Get('lease/:leaseId')
  findByLease(@Param('leaseId') leaseId: string, @CurrentUser() user: JwtPayload) {
    return this.rentService.findByLease(leaseId, user.orgId);
  }

  @Post(':periodId/payments')
  recordPayment(
    @Param('periodId') periodId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rentService.recordPayment(periodId, user.orgId, user.sub, dto);
  }
}
