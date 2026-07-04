import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { LockPeriodDto } from './dto/lock-period.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('accounting/locks')
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  @Get()
  @RequirePermission('accounting:read')
  list(@CurrentUser() user: JwtPayload) {
    return this.accounting.list(user.orgId);
  }

  @Post()
  @RequirePermission('accounting:update')
  @Audit('locked-period', 'lock')
  lock(@Body() dto: LockPeriodDto, @CurrentUser() user: JwtPayload) {
    return this.accounting.lock(user.orgId, user.sub, dto);
  }

  @Delete(':yearMonth')
  @RequirePermission('accounting:update')
  @Audit('locked-period', 'unlock')
  unlock(@Param('yearMonth') yearMonth: string, @CurrentUser() user: JwtPayload) {
    return this.accounting.unlock(user.orgId, user.sub, yearMonth);
  }
}
