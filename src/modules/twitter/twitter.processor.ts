import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TwitterService } from './twitter.service';
import { SentimentService } from '../sentiment/sentiment.service';
import { CommunityPost } from '../../entities/community-post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SentimentResult } from '../sentiment/sentiment.controller';

@Processor('tweet-processing')
export class TwitterProcessor {
  private readonly logger = new Logger(TwitterProcessor.name);

  constructor(
    private readonly twitterService: TwitterService,
    private readonly sentimentService: SentimentService,
    @InjectRepository(CommunityPost)
    private readonly communityPostRepository: Repository<CommunityPost>,
  ) {}

  @Process('process')
  async processTweet(job: Job<{ tweet: any; timestamp: Date }>) {
    try {
      const { tweet, timestamp } = job.data;
      
      // Analyze sentiment
      const sentimentResult = await this.sentimentService.analyzeSentimentWithContext(
        tweet.data.text,
        {
          source: 'twitter',
          author: tweet.includes?.users?.[0]?.username || 'unknown',
          timestamp: new Date(tweet.data.created_at),
        },
      ) as SentimentResult;

      // Create community post
      const post = this.communityPostRepository.create({
        content: tweet.data.text,
        source: 'twitter',
        author: tweet.includes?.users?.[0]?.username || 'unknown',
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        sentimentMagnitude: sentimentResult.magnitude,
        keywords: sentimentResult.keywords,
        metadata: {
          tweetId: tweet.data.id,
          metrics: tweet.data.public_metrics,
          entities: tweet.data.entities,
        },
        timestamp: new Date(tweet.data.created_at),
      });

      await this.communityPostRepository.save(post);
      this.logger.debug(`Processed tweet ${tweet.data.id}`);

    } catch (error) {
      this.logger.error(
        `Error processing tweet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
} 