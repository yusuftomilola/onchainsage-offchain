import { JobService } from '@/job/job.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RetryStrategyService {
  constructor(private readonly jobService: JobService) {}

  async retry(jobId: number, attempts: number) {
    const delay = Math.pow(2, attempts) * 1000; // exponential backoff
    setTimeout(() => this.jobService.run(jobId, attempts), delay);
  }
}