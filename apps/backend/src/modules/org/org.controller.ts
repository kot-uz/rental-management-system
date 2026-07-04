import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrgService } from './org.service';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('org')
@ApiBearerAuth()
@Controller('org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get()
  @RequirePermission('org:read')
  get(@CurrentUser() user: JwtPayload) {
    return this.orgService.get(user.orgId);
  }

  @Patch('settings')
  @RequirePermission('org:update')
  @Audit('org')
  update(@Body() dto: UpdateOrgSettingsDto, @CurrentUser() user: JwtPayload) {
    return this.orgService.update(user.orgId, dto);
  }
}
