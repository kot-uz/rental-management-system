import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @RequirePermission('documents:create')
  @Audit('document')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.documents.create(user.orgId, user.sub, file, dto);
  }

  @Get()
  @RequirePermission('documents:read')
  @ApiQuery({ name: 'ownerType', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('ownerType') ownerType?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.documents.findAll(user.orgId, ownerType, ownerId);
  }

  @Get(':id')
  @RequirePermission('documents:read')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.documents.findOne(id, user.orgId);
  }

  @Get(':id/url')
  @RequirePermission('documents:read')
  async getUrl(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const url = await this.documents.getUrl(id, user.orgId);
    return { url };
  }

  @Patch(':id')
  @RequirePermission('documents:update')
  @Audit('document')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documents.update(id, user.orgId, dto);
  }

  @Delete(':id')
  @RequirePermission('documents:delete')
  @Audit('document')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.documents.remove(id, user.orgId);
  }
}
