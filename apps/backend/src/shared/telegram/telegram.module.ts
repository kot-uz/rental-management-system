import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TelegramService } from './telegram.service';
import { TelegramProcessor } from './telegram.processor';
import { TELEGRAM_QUEUE } from '../../queue/queue.constants';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: TELEGRAM_QUEUE })],
  providers: [TelegramService, TelegramProcessor],
  exports: [TelegramService],
})
export class TelegramModule {}
