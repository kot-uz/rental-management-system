import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const OWNER_TYPES = ['apartment', 'lease', 'tenant', 'contractor'];
export const DOCUMENT_TYPES = ['LEASE', 'INSURANCE', 'OTHER'];

/**
 * Multipart body accompanying the uploaded file. Sent as form fields, so
 * everything arrives as strings — keep validators string-oriented.
 */
export class CreateDocumentDto {
  @ApiProperty({ enum: OWNER_TYPES })
  @IsIn(OWNER_TYPES)
  ownerType: string;

  @ApiProperty()
  @IsString()
  ownerId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ enum: DOCUMENT_TYPES, default: 'OTHER' })
  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  documentType?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
