import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WEBHOOK_EVENTS } from '../webhook-events';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://example.com/hooks/rental' })
  @IsUrl({ require_tld: false, require_protocol: true })
  url: string;

  @ApiProperty({ enum: WEBHOOK_EVENTS, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(WEBHOOK_EVENTS as unknown as string[], { each: true })
  events: string[];

  @ApiProperty({ example: 'whsec_my-shared-secret' })
  @IsString()
  @MinLength(8)
  secret: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
