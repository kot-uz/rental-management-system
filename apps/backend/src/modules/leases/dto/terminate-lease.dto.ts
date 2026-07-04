import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TerminateLeaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terminationNote?: string;

  @ApiPropertyOptional({ description: 'Early termination penalty amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  penaltyAmount?: number;
}
