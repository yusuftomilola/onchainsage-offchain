import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity } from './job.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
  ) {}

  async run(jobId: number, attempt = 0): Promise<void> {
    const job = await this.jobRepo.findOneBy({ id: jobId });
    if (!job) return;

    job.status = 'RUNNING';
    job.startedAt = new Date();
    await this.jobRepo.save(job);

    try {
      // Placeholder for actual job logic
      console.log(`Executing job ${job.name}`);

      job.status = 'COMPLETED';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'FAILED';
      job.attempts = attempt + 1;
    } finally {
      await this.jobRepo.save(job);
    }
  }
}