import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const TAGGABLE_TYPES = ['apartment', 'tenant', 'repair', 'contractor', 'lease'];

export class AssignTagDto {
  @ApiProperty({ enum: TAGGABLE_TYPES })
  @IsIn(TAGGABLE_TYPES)
  entityType: string;

  @ApiProperty()
  @IsString()
  entityId: string;
}
