import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { FilesService } from './files.service';
import {
  FILE_PROCESSING_QUEUE,
  FileJobs,
  ProcessImageJobData,
} from '../../queue/queue.constants';

@Processor(FILE_PROCESSING_QUEUE)
export class FileProcessingProcessor {
  private readonly logger = new Logger(FileProcessingProcessor.name);

  constructor(private readonly filesService: FilesService) {}

  @Process(FileJobs.PROCESS_IMAGE)
  async handleProcessImage(job: Job<ProcessImageJobData>): Promise<void> {
    await this.filesService.processImage(job.data.fileId);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<ProcessImageJobData>): void {
    this.logger.log(`Processed file ${job.data.fileId} (job ${job.id})`);
  }

  @OnQueueFailed()
  onFailed(job: Job<ProcessImageJobData>, err: Error): void {
    this.logger.error(
      `Failed to process file ${job.data?.fileId} (job ${job.id}, attempt ${job.attemptsMade}): ${err.message}`,
    );
  }
}
