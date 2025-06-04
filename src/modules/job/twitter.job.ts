import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TwitterService } from '../twitter/twitter.service';

@Injectable()
export class TwitterJob {
  private readonly logger = new Logger(TwitterJob.name);

  constructor(private readonly twitterService: TwitterService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.log('Cron triggered: collect tweets');
    try {
      await this.twitterService.collectTweets();
    } catch (err) {
      this.logger.error('Error in TwitterJob.handleCron', err);
    }
  }
}
