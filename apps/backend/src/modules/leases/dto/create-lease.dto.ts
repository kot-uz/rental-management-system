import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLeaseDto {
  @ApiProperty()
  @IsString()
  apartmentId: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-12-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRent: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 3000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  depositAmount: number;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 28 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  @Type(() => Number)
  rentDueDay?: number;

  @ApiProperty({ description: 'Primary tenant ID' })
  @IsString()
  primaryTenantId: string;

  @ApiPropertyOptional({ type: [String], description: 'Additional tenant IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalTenantIds?: string[];
}
