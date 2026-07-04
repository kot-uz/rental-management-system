import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramLinkService } from './telegram.service';

@Module({
  controllers: [TelegramController],
  providers: [TelegramLinkService],
  exports: [TelegramLinkService],
})
export class TelegramLinkModule {}
