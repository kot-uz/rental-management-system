import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('ownerId') ownerId: string,
    @Body('ownerType') ownerType: string,
    @Body('purpose') purpose: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.filesService.upload(file, user.orgId, ownerId, ownerType, purpose);
  }

  @Get(':id/url')
  async getUrl(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const url = await this.filesService.getSignedUrl(id, user.orgId);
    return { url };
  }

  @Get(':id/thumb')
  async getThumb(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const url = await this.filesService.getThumbUrl(id, user.orgId);
    return { url };
  }

  @Get('owner/:ownerType/:ownerId')
  getByOwner(
    @Param('ownerType') ownerType: string,
    @Param('ownerId') ownerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.filesService.getByOwner(ownerId, ownerType, user.orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.filesService.delete(id, user.orgId);
  }
}
