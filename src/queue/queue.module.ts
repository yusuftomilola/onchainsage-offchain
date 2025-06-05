import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { BullMQProvider } from './BullMQProvider';
import { JobProcessor } from './job.processor';

@Module({
  controllers: [QueueController],
  providers: [BullMQProvider, QueueService, JobProcessor],
  exports: [QueueService],
})
export class QueueModule {}
