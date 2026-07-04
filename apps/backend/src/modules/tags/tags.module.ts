import { Global, Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';

// Global so list services (apartments, repairs, …) can resolve tag → entityIds
// for filtering without importing this module everywhere.
@Global()
@Module({
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
