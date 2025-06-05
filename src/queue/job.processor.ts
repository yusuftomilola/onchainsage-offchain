import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('job-queue')
export class JobProcessor extends WorkerHost {
  async process(job: Job): Promise<any> {
    console.log(`🚀 Processing job [${job.name}] with data:`, job.data);

    // simulate job work
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(`✅ Job [${job.name}] done`);
    return true;
  }
}