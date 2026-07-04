import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { TerminateLeaseDto } from './dto/terminate-lease.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AddDeductionDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiProperty()
  @IsString()
  reason: string;
}

class SettleDepositDto {
  @ApiProperty({ description: 'Amount returned to the tenant' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  returnAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('leases')
@ApiBearerAuth()
@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post()
  @RequirePermission('leases:create')
  @Audit('lease')
  create(@Body() dto: CreateLeaseDto, @CurrentUser() user: JwtPayload) {
    return this.leasesService.create(user.orgId, dto);
  }

  @Get()
  @ApiQuery({ name: 'apartmentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('apartmentId') apartmentId?: string,
    @Query('status') status?: string,
  ) {
    return this.leasesService.findAll(user.orgId, apartmentId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.leasesService.findOne(id, user.orgId);
  }

  @Patch(':id/terminate')
  @RequirePermission('leases:end')
  @Audit('lease', 'terminate')
  terminate(
    @Param('id') id: string,
    @Body() dto: TerminateLeaseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leasesService.terminate(id, user.orgId, dto);
  }

  @Post(':id/deductions')
  @RequirePermission('deposits:update')
  @Audit('lease', 'deposit-deduction')
  addDeduction(
    @Param('id') id: string,
    @Body() dto: AddDeductionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leasesService.addDeduction(id, user.orgId, dto.amount, dto.reason);
  }

  @Post(':id/deposit/settle')
  @RequirePermission('deposits:update')
  @Audit('lease', 'deposit-settle')
  settleDeposit(
    @Param('id') id: string,
    @Body() dto: SettleDepositDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leasesService.settleDeposit(id, user.orgId, dto.returnAmount, dto.note);
  }
}
