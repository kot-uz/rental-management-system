import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RepairSeverity } from '@prisma/client';

export class CreateRepairDto {
  @ApiProperty()
  @IsString()
  apartmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leaseId?: string;

  @ApiProperty({ example: 'Leaking faucet in kitchen' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: RepairSeverity, default: RepairSeverity.LOW })
  @IsOptional()
  @IsEnum(RepairSeverity)
  severity?: RepairSeverity;

  @ApiPropertyOptional({ example: 'Kitchen' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costEstimate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractorPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractorNotes?: string;
}
