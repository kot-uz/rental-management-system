import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  @RequirePermission('webhooks:create')
  @Audit('webhook')
  create(@Body() dto: CreateWebhookDto, @CurrentUser() user: JwtPayload) {
    return this.webhooks.create(user.orgId, dto);
  }

  @Get()
  @RequirePermission('webhooks:read')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.webhooks.findAll(user.orgId);
  }

  @Get(':id/deliveries')
  @RequirePermission('webhooks:read')
  getDeliveries(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.webhooks.getDeliveries(id, user.orgId);
  }

  @Patch(':id')
  @RequirePermission('webhooks:update')
  @Audit('webhook')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.webhooks.update(id, user.orgId, dto);
  }

  @Post(':id/test')
  @RequirePermission('webhooks:update')
  @HttpCode(HttpStatus.ACCEPTED)
  test(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.webhooks.test(id, user.orgId);
  }

  @Delete(':id')
  @RequirePermission('webhooks:delete')
  @Audit('webhook')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.webhooks.remove(id, user.orgId);
  }
}
