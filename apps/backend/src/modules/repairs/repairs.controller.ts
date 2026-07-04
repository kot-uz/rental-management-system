import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RepairsService } from './repairs.service';
import { CreateRepairDto } from './dto/create-repair.dto';
import { UpdateRepairDto } from './dto/update-repair.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RepairStatus } from '@prisma/client';

class TransitionDto {
  @ApiProperty({ enum: RepairStatus })
  @IsEnum(RepairStatus)
  status: RepairStatus;
}

class AddCommentDto {
  @ApiProperty()
  @IsString()
  body: string;
}

@ApiTags('repairs')
@ApiBearerAuth()
@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @RequirePermission('repairs:create')
  @Audit('repair')
  create(@Body() dto: CreateRepairDto, @CurrentUser() user: JwtPayload) {
    return this.repairsService.create(user.orgId, dto);
  }

  @Get()
  @ApiQuery({ name: 'apartmentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tagId', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('apartmentId') apartmentId?: string,
    @Query('status') status?: string,
    @Query('tagId') tagId?: string,
  ) {
    return this.repairsService.findAll(user.orgId, apartmentId, status, tagId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.repairsService.findOne(id, user.orgId);
  }

  @Patch(':id')
  @RequirePermission('repairs:update.operational')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRepairDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.repairsService.update(id, user.orgId, dto);
  }

  @Patch(':id/status')
  @RequirePermission('repairs:update.operational')
  @Audit('repair', 'status_change')
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.repairsService.transition(id, user.orgId, dto.status);
  }

  @Post(':id/comments')
  @RequirePermission('repairs:comment')
  addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.repairsService.addComment(id, user.orgId, user.sub, dto.body);
  }

  @Delete(':id')
  @RequirePermission('repairs:delete')
  @Audit('repair')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.repairsService.remove(id, user.orgId);
  }
}
