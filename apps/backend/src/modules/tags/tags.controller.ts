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
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AssignTagDto } from './dto/assign-tag.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Post()
  @RequirePermission('tags:create')
  @Audit('tag')
  create(@Body() dto: CreateTagDto, @CurrentUser() user: JwtPayload) {
    return this.tags.create(user.orgId, dto);
  }

  @Get()
  @RequirePermission('tags:read')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.tags.findAll(user.orgId);
  }

  @Get('entity')
  @RequirePermission('tags:read')
  @ApiQuery({ name: 'entityType', required: true })
  @ApiQuery({ name: 'entityId', required: true })
  forEntity(
    @CurrentUser() user: JwtPayload,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.tags.forEntity(user.orgId, entityType, entityId);
  }

  @Patch(':id')
  @RequirePermission('tags:update')
  @Audit('tag')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto, @CurrentUser() user: JwtPayload) {
    return this.tags.update(id, user.orgId, dto);
  }

  @Post(':id/assign')
  @RequirePermission('tags:update')
  assign(@Param('id') id: string, @Body() dto: AssignTagDto, @CurrentUser() user: JwtPayload) {
    return this.tags.assign(id, user.orgId, dto.entityType, dto.entityId);
  }

  @Post(':id/unassign')
  @RequirePermission('tags:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassign(
    @Param('id') id: string,
    @Body() dto: AssignTagDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.tags.unassign(id, user.orgId, dto.entityType, dto.entityId);
  }

  @Delete(':id')
  @RequirePermission('tags:delete')
  @Audit('tag')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.tags.remove(id, user.orgId);
  }
}
