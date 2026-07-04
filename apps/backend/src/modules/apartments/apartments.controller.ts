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
import { ApartmentsService } from './apartments.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('apartments')
@ApiBearerAuth()
@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Post()
  @RequirePermission('apartments:create')
  @Audit('apartment')
  create(@Body() dto: CreateApartmentDto, @CurrentUser() user: JwtPayload) {
    return this.apartmentsService.create(user.orgId, dto);
  }

  @Get()
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tagId', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('tagId') tagId?: string,
  ) {
    return this.apartmentsService.findAll(user.orgId, search, status, tagId);
  }

  @Get('stats')
  getStats(@CurrentUser() user: JwtPayload) {
    return this.apartmentsService.getStats(user.orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.apartmentsService.findOne(id, user.orgId);
  }

  @Patch(':id')
  @RequirePermission('apartments:update')
  @Audit('apartment')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateApartmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.apartmentsService.update(id, user.orgId, dto);
  }

  @Delete(':id')
  @RequirePermission('apartments:delete')
  @Audit('apartment')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.apartmentsService.remove(id, user.orgId);
  }
}
