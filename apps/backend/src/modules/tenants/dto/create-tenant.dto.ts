import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdType } from '@prisma/client';

export class CreateTenantDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: '+79001234567' })
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiPropertyOptional({ enum: IdType, default: IdType.PASSPORT })
  @IsOptional()
  @IsEnum(IdType)
  idType?: IdType;

  @ApiProperty({ example: '1234 567890' })
  @IsString()
  @MaxLength(50)
  idNumber: string;

  @ApiPropertyOptional({ example: '@johndoe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  telegram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
