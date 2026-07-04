import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { RepairPaymentStatus } from '@prisma/client';
import { CreateRepairDto } from './create-repair.dto';

export class UpdateRepairDto extends PartialType(CreateRepairDto) {
  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsNumber()
  costActual?: number;

  @ApiPropertyOptional({ enum: RepairPaymentStatus })
  @IsOptional()
  @IsEnum(RepairPaymentStatus)
  paymentStatus?: RepairPaymentStatus;
}
