import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(@Inject('BULLMQ_QUEUE') private readonly queue: Queue) {}

  async scheduleJob(name: string, data: any, delayMs = 0) {
    await this.queue.add(name, data, {
      delay: delayMs,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      priority: data.priority || 1,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}