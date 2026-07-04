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
import { ContractorsService } from './contractors.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('contractors')
@ApiBearerAuth()
@Controller('contractors')
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Post()
  @RequirePermission('contractors:create')
  @Audit('contractor')
  create(@Body() dto: CreateContractorDto, @CurrentUser() user: JwtPayload) {
    return this.contractorsService.create(user.orgId, dto);
  }

  @Get()
  @ApiQuery({ name: 'search', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.contractorsService.findAll(user.orgId, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.contractorsService.findOne(id, user.orgId);
  }

  @Patch(':id')
  @RequirePermission('contractors:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contractorsService.update(id, user.orgId, dto);
  }

  @Delete(':id')
  @RequirePermission('contractors:delete')
  @Audit('contractor')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.contractorsService.remove(id, user.orgId);
  }
}
