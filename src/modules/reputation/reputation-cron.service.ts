import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReputationService } from './reputation.service'; // adjust path
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reputation } from './entities/reputation.entity';

@Injectable()
export class ReputationCronService {
  constructor(
    private readonly reputationService: ReputationService,
    @InjectRepository(Reputation)
    private readonly reputationRepo: Repository<Reputation>,
  ) {}

  // Runs every Monday at 2am
  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyReview() {
    const users = await this.reputationRepo.find();
    const userIds = users.map((u) => u.userId);
    await this.reputationService.reviewAllUsers(userIds);
    console.log('✅ Weekly user reputation review completed.');
  }
}
