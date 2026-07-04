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
import { UtilitiesService, UpdateUtilityDto } from './utilities.service';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('utilities')
@ApiBearerAuth()
@Controller('utilities')
export class UtilitiesController {
  constructor(private readonly utilitiesService: UtilitiesService) {}

  @Post()
  create(@Body() dto: CreateUtilityDto, @CurrentUser() user: JwtPayload) {
    return this.utilitiesService.create(user.orgId, dto);
  }

  @Get()
  @ApiQuery({ name: 'apartmentId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('apartmentId') apartmentId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.utilitiesService.findAll(user.orgId, apartmentId, type, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.utilitiesService.findOne(id, user.orgId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUtilityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.utilitiesService.update(id, user.orgId, dto);
  }

  @Patch(':id/pay')
  markPaid(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.utilitiesService.markPaid(id, user.orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.utilitiesService.remove(id, user.orgId);
  }
}
