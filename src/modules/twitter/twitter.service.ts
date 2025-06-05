import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwitterApi, TweetV2 } from 'twitter-api-v2';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { PerformanceMetric } from '../../entities/performance-metric.entity';
import { CommunityPost } from '../../entities/community-post.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  TTweetv2TweetField,
  TTweetv2Expansion,
  TTweetv2UserField,
} from 'twitter-api-v2';

@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);
  private readonly client: TwitterApi;
  private readonly tradingKeywords = [
    'crypto', 'bitcoin', 'ethereum', 'trading', 'token', 'blockchain',
    'defi', 'nft', 'web3', 'altcoin', 'bullish', 'bearish',
  ];

  constructor(
    private configService: ConfigService,
    @InjectRepository(CommunityPost)
    private readonly communityPostRepository: Repository<CommunityPost>,
    @InjectQueue('tweet-processing') private readonly tweetQueue: Queue,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(PerformanceMetric)
    private readonly performanceMetricRepository: Repository<PerformanceMetric>,
  ) {
    this.client = new TwitterApi({
      appKey: this.configService.get('TWITTER_API_KEY'),
      appSecret: this.configService.get('TWITTER_API_SECRET'),
      accessToken: this.configService.get('TWITTER_ACCESS_TOKEN'),
      accessSecret: this.configService.get('TWITTER_ACCESS_SECRET'),
    });
  }

  async startStreaming() {
    try {
      const rules = await this.client.v2.streamRules();
      if (rules.data?.length) {
        await this.client.v2.updateStreamRules({
          delete: { ids: rules.data.map(rule => rule.id) },
        });
      }

      await this.client.v2.updateStreamRules({
        add: this.tradingKeywords.map(keyword => ({
          value: `${keyword} -is:retweet -is:reply`,
          tag: keyword,
        })),
      });

      const stream = await this.client.v2.searchStream({
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'entities'],
        'user.fields': ['username', 'public_metrics'],
        expansions: ['author_id', 'entities.mentions.username'],
      });

      stream.on('data', async (tweet) => {
        await this.processTweet(tweet);
      });

      stream.on('error', (error) => {
        this.logger.error('Twitter stream error:', error);
      });

    } catch (error) {
      this.logger.error('Error starting Twitter stream:', error);
      throw error;
    }
  }

  private async processTweet(tweet: any) {
    try {
      const cacheKey = `tweet:${tweet.data.id}`;
      const cachedTweet = await this.cacheManager.get(cacheKey);
      if (cachedTweet) return;

      await this.tweetQueue.add('process', {
        tweet,
        timestamp: new Date(),
      });

      await this.cacheManager.set(cacheKey, true, 3600000); // 1 hour
    } catch (error) {
      this.logger.error('Error processing tweet:', error);
    }
  }

  async searchTweets(
    query: string,
    startTime?: Date,
    endTime?: Date,
    maxResults?: number,
  ) {
    try {
      const options: Partial<{
        start_time: string;
        end_time: string;
        'tweet.fields': TTweetv2TweetField[];
        expansions: TTweetv2Expansion[];
        'user.fields': TTweetv2UserField[];
        max_results: number;
      }> = {
        start_time: startTime?.toISOString(),
        end_time: endTime?.toISOString(),
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'entities'],
        expansions: ['author_id', 'attachments.media_keys'],
        'user.fields': ['username', 'name', 'profile_image_url', 'public_metrics'],
        max_results: maxResults || 100,
      };

      const tweets = await this.client.v2.search(query, options);
      return tweets;
    } catch (error) {
      this.logger.error(
        `Error searching tweets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async searchHistoricalTweets(query: string, startTime: Date, endTime: Date) {
    try {
      const tweets = await this.client.v2.search(query, {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'entities'],
        'user.fields': ['username', 'public_metrics'],
        expansions: ['author_id', 'entities.mentions.username'],
        max_results: 100,
      });

      return tweets;
    } catch (error) {
      this.logger.error('Error searching historical tweets:', error);
      throw error;
    }
  }

  async getTrendingTopics(woeid: number = 1) {
    try {
      const trends = await this.client.v1.trendsByPlace(woeid);
      return trends;
    } catch (error) {
      this.logger.error(
        `Error fetching trending topics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getApiMetrics() {
    try {
      const rateLimits = await this.client.v1.rateLimitStatuses();
      const searchTweetLimit = rateLimits.resources.statuses?.['/statuses/user_timeline'];

      return {
        remaining: searchTweetLimit?.remaining ?? 0,
        reset: searchTweetLimit?.reset ?? 0,
        limit: searchTweetLimit?.limit ?? 0,
      };
    } catch (error) {
      this.logger.error('Error getting API metrics:', error);
      throw error;
    }
  }

  async trackPerformance(metrics: {
    accuracy: number;
    totalProfit: number;
    totalLoss: number;
    totalTrades: number;
    winRate: number;
    averageProfit: number;
    averageLoss: number;
    profitFactor: number;
    maxDrawdown: number;
  }) {
    try {
      const performanceMetric = this.performanceMetricRepository.create({
        ...metrics,
        metrics: {
          winRate: metrics.winRate,
          averageProfit: metrics.averageProfit,
          averageLoss: metrics.averageLoss,
          profitFactor: metrics.profitFactor,
          maxDrawdown: metrics.maxDrawdown,
        },
        timestamp: new Date(),
      });

      await this.performanceMetricRepository.save(performanceMetric);
    } catch (error) {
      this.logger.error('Error tracking performance:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(timeframe: string) {
    try {
      const startDate = this.getStartDate(timeframe);
      const metrics = await this.performanceMetricRepository.find({
        where: {
          timestamp: MoreThanOrEqual(startDate),
        },
        order: {
          timestamp: 'DESC',
        },
      });

      return this.calculateAggregateMetrics(metrics);
    } catch (error) {
      this.logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  private getStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 1));
    }
  }

  private calculateAggregateMetrics(metrics: PerformanceMetric[]) {
    if (!metrics.length) {
      return {
        averageAccuracy: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        profitFactor: 0,
      };
    }

    return {
      averageAccuracy: metrics.reduce((acc, m) => acc + m.accuracy, 0) / metrics.length,
      totalProfit: metrics.reduce((acc, m) => acc + m.totalProfit, 0),
      totalLoss: metrics.reduce((acc, m) => acc + m.totalLoss, 0),
      winRate: metrics.reduce((acc, m) => acc + m.metrics.winRate, 0) / metrics.length,
      profitFactor: metrics.reduce((acc, m) => acc + m.metrics.profitFactor, 0) / metrics.length,
    };
  }
}
