import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SentimentProcessor } from './sentiment.processor';
import { SentimentResult } from './sentiment.controller';

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  constructor(
    private readonly sentimentProcessor: SentimentProcessor,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    try {
      const cacheKey = `sentiment:${text}`;
      const cachedResult = await this.cacheManager.get<SentimentResult>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const result = await this.sentimentProcessor.analyzeSentiment(text);
      const sentimentResult: SentimentResult = {
        score: result.score,
        magnitude: result.magnitude,
        sentiment: result.sentiment,
        keywords: result.keywords,
      };

      await this.cacheManager.set(cacheKey, sentimentResult, 3600); // 1 hour in seconds
      return sentimentResult;
    } catch (error) {
      this.logger.error(
        `Error analyzing sentiment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async analyzeBatchSentiment(texts: string[]): Promise<SentimentResult[]> {
    try {
      const results = await Promise.all(
        texts.map(async (text) => {
          const cacheKey = `sentiment:${text}`;
          const cachedResult = await this.cacheManager.get<SentimentResult>(cacheKey);
          if (cachedResult) {
            return cachedResult;
          }

          const result = await this.sentimentProcessor.analyzeSentiment(text);
          const sentimentResult: SentimentResult = {
            score: result.score,
            magnitude: result.magnitude,
            sentiment: result.sentiment,
            keywords: result.keywords,
          };

          await this.cacheManager.set(cacheKey, sentimentResult, 3600);
          return sentimentResult;
        }),
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Error analyzing batch sentiment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async analyzeSentimentWithContext(text: string, context?: {
    source?: string;
    author?: string;
    timestamp?: Date;
  }): Promise<SentimentResult> {
    try {
      const sentiment = await this.analyzeSentiment(text);
      return {
        ...sentiment,
        context: {
          source: context?.source || 'unknown',
          author: context?.author || 'unknown',
          timestamp: context?.timestamp || new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error analyzing sentiment with context: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
} 