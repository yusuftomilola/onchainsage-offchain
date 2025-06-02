import { Controller, Post } from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('test-job')
  async scheduleTestJob() {
    await this.queueService.scheduleJob('example-job', { payload: 'hello world' });
    return { message: 'Job scheduled' };
  }
}
