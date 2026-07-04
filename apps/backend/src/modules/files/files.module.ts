import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BullModule } from '@nestjs/bull';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FileProcessingProcessor } from './file-processing.processor';
import { FILE_PROCESSING_QUEUE } from '../../queue/queue.constants';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    BullModule.registerQueue({ name: FILE_PROCESSING_QUEUE }),
  ],
  controllers: [FilesController],
  providers: [FilesService, FileProcessingProcessor],
  exports: [FilesService],
})
export class FilesModule {}
