import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.findForUser(user.sub, user.orgId, unreadOnly);
  }

  @Get('count')
  getCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUnreadCount(user.sub, user.orgId);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.notificationsService.markRead(id, user.sub);
    return { ok: true };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllRead(user.sub, user.orgId);
    return { ok: true };
  }
}
