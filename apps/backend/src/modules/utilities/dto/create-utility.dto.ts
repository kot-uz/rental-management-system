import {
  IsString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UtilityType } from '@prisma/client';

export class CreateUtilityDto {
  @ApiProperty()
  @IsString()
  apartmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leaseId?: string;

  @ApiProperty({ enum: UtilityType })
  @IsEnum(UtilityType)
  type: UtilityType;

  @ApiPropertyOptional({ description: 'Required when type=CUSTOM' })
  @IsOptional()
  @IsString()
  customTypeName?: string;

  @ApiProperty({ example: 2024 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  periodYear: number;

  @ApiProperty({ example: 1, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  periodMonth: number;

  @ApiPropertyOptional({ example: 100.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readingFrom?: number;

  @ApiPropertyOptional({ example: 130.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  readingTo?: number;

  @ApiProperty({ example: 450.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
