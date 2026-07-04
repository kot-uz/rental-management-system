import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TelegramLinkService } from './telegram.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('telegram')
@ApiBearerAuth()
@Controller('telegram')
export class TelegramController {
  constructor(private readonly linkService: TelegramLinkService) {}

  /** Generate a Telegram deep link to bind the current owner's chat. */
  @Post('link/me')
  linkMe(@CurrentUser() user: JwtPayload) {
    return this.linkService.createLink(user.orgId, 'user', user.sub);
  }

  /** Generate a Telegram deep link to bind a tenant's chat (owner shares it). */
  @Post('link/tenant/:id')
  @RequirePermission('tenants:update')
  linkTenant(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.linkService.createLink(user.orgId, 'tenant', id);
  }

  @Get('status')
  status(@CurrentUser() user: JwtPayload) {
    return this.linkService.getStatus(user.sub);
  }
}
