import { PartialType } from '@nestjs/swagger';
import { CreateApartmentDto } from './create-apartment.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApartmentStatus } from '@prisma/client';

export class UpdateApartmentDto extends PartialType(CreateApartmentDto) {
  @IsOptional()
  @IsEnum(ApartmentStatus)
  status?: ApartmentStatus;
}
