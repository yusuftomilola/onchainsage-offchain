import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { SentimentResult } from './dto/sentiment.result.dto';



@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  constructor(
    @InjectQueue('sentiment-analysis') private sentimentQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  async analyzeSentiment(text: string): Promise<SentimentResult> {
  const cacheKey = `sentiment:${text}`;
  const cachedResult = await this.cacheManager.get<SentimentResult>(cacheKey);
  if (cachedResult) {
    this.logger.log(`Cache hit for text: "${text}"`);
    return cachedResult;
  }

  const job = await this.sentimentQueue.add('analyze', {
    text,
    timestamp: new Date(),
  });

  const result = await job.finished();

  // 👇 Add this logging here
  this.logger.debug('Raw sentiment job result:', result);

  const formatted = this.formatSentimentResult(result);

  await this.cacheManager.set(cacheKey, formatted, 3600); // TTL in seconds

  return formatted;
}


  async batchAnalyze(texts: string[]): Promise<SentimentResult[]> {
  const jobs = await Promise.all(
    texts.map((text) =>
      this.sentimentQueue.add('analyze', {
        text,
        timestamp: new Date(),
      }),
    ),
  );

  const results = await Promise.all(jobs.map((job) => job.finished()));

  // 👇 Add debug log for each result
  results.forEach((res, i) => {
    this.logger.debug(`Raw result for text[${i}]:`, res);
  });

  return results.map((res) => this.formatSentimentResult(res));
}


 private formatSentimentResult(raw: any): SentimentResult {
  // Validate sentiment or fallback to 'neutral'
  const sentimentValues = ['positive', 'neutral', 'negative'] as const;
  const sentiment = sentimentValues.includes(raw.sentiment) ? raw.sentiment : 'neutral';

  return {
    sentiment,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    relevanceScore: typeof raw.relevanceScore === 'number' ? raw.relevanceScore : 0,
    score: typeof raw.score === 'number' ? raw.score : 0,
    magnitude: typeof raw.magnitude === 'number' ? raw.magnitude : 0,
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
  };
}

  async getTrendingTopics(timeframe: string): Promise<string[]> {
    // TODO: Implement trend detection logic her
    return [];
  }

  async getConfidenceMetrics(): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
  }> {
    // TODO: Implement metrics logic here
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
    };
  }
}
