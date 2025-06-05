import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { MarketSentiment } from '../entities/market-sentiment.entity';
import { AnalyticsCacheService } from './analytics-cache.service';

interface SentimentSummary {
  averageScore: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  totalMentions: number;
  totalEngagements: number;
  topSources: string[];
  topKeyPhrases: string[];
  topInfluencers: string[];
  sentimentTrend: 'improving' | 'declining' | 'stable';
}

@Injectable()
export class MarketSentimentService {
  private readonly logger = new Logger(MarketSentimentService.name);

  constructor(
    @InjectRepository(MarketSentiment)
    private readonly marketSentimentRepository: Repository<MarketSentiment>,
    private readonly cacheService: AnalyticsCacheService,
  ) {}

  /**
   * Get market sentiment analysis.
   * @param tokenAddress Optional: Filter by token address.
   * @param source Optional: Filter by sentiment source.
   * @param from Start date (ISO 8601).
   * @param to End date (ISO 8601).
   * @param granularity Time granularity (1h, 1d, 1w, 1m).
   * @returns Sentiment data.
   */
  async getSentiment(
    tokenAddress?: string,
    source?: string,
    from?: string,
    to?: string,
    granularity: string = '1d',
  ): Promise<any> {
    const cacheKey = `market-sentiment:${tokenAddress || 'all'}:${source || 'all'}:${from}:${to}:${granularity}`;
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    this.logger.log(
      `Fetching market sentiment for token: ${tokenAddress}, source: ${source}, from: ${from}, to: ${to}, granularity: ${granularity}`,
    );
    
    try {
      // Parse date parameters
      const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
      const toDate = to ? new Date(to) : new Date();
      
      // Validate dates
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error('Invalid date format. Please use ISO 8601 format (YYYY-MM-DD).');
      }
      
      // Map granularity to timeframe in database
      const timeframeMap: Record<string, string> = {
        '1h': 'HOUR',
        '1d': 'DAY',
        '1w': 'WEEK',
        '1m': 'MONTH'
      };
      
      const timeframe = timeframeMap[granularity] || 'DAY';
      
      // Build query conditions
      const whereConditions: FindOptionsWhere<MarketSentiment> = {
        timeframe,
        timestamp: Between(fromDate, toDate)
      };
      
      // Add optional filters
      if (tokenAddress) {
        whereConditions.tokenAddress = tokenAddress;
      }
      
      if (source) {
        whereConditions.source = source;
      }
      
      // Query the database
      const sentimentData = await this.marketSentimentRepository.find({
        where: whereConditions,
        order: {
          timestamp: 'ASC'
        }
      });
      
      if (!sentimentData || sentimentData.length === 0) {
        return {
          tokenAddress: tokenAddress || 'all',
          source: source || 'all',
          granularity,
          message: 'No sentiment data found for the specified parameters',
          data: []
        };
      }
      
      // Calculate sentiment summary
      const summary = this.calculateSentimentSummary(sentimentData);
      
      // Transform data for response
      const result = {
        tokenAddress: tokenAddress || 'all',
        source: source || 'all',
        granularity,
        dataPoints: sentimentData.length,
        timeframe,
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        },
        data: sentimentData.map(item => ({
          timestamp: item.timestamp,
          source: item.source,
          sentimentScore: item.sentimentScore,
          mentionCount: item.mentionCount,
          engagementCount: item.engagementCount,
          keyPhrases: item.keyPhrases,
          topInfluencers: item.topInfluencers
        })),
        summary
      };
      
      // Cache the result
      const cacheTTL = this.getCacheTTLForGranularity(granularity);
      await this.cacheService.set(cacheKey, result, cacheTTL);
      
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error fetching market sentiment: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Calculate cache TTL based on data granularity
   * @param granularity Time granularity
   * @returns TTL in seconds
   */
  private getCacheTTLForGranularity(granularity: string): number {
    const ttlMap: Record<string, number> = {
      '1h': 5 * 60,     // 5 minutes for hourly data
      '1d': 15 * 60,    // 15 minutes for daily data
      '1w': 30 * 60,    // 30 minutes for weekly data
      '1m': 60 * 60     // 1 hour for monthly data
    };
    
    return ttlMap[granularity] || 15 * 60; // Default to 15 minutes
  }
  
  /**
   * Calculate sentiment summary metrics from sentiment data
   * @param data Array of market sentiment data points
   * @returns Summary metrics object
   */
  private calculateSentimentSummary(data: MarketSentiment[]): SentimentSummary {
    if (!data || data.length === 0) {
      return {
        averageScore: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        totalMentions: 0,
        totalEngagements: 0,
        topSources: [],
        topKeyPhrases: [],
        topInfluencers: [],
        sentimentTrend: 'stable'
      };
    }
    
    // Calculate average sentiment score
    const sentimentScores = data.map(item => item.sentimentScore);
    const averageScore = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    
    // Count sentiment categories
    const positiveCount = sentimentScores.filter(score => score > 0.3).length;
    const neutralCount = sentimentScores.filter(score => score >= -0.3 && score <= 0.3).length;
    const negativeCount = sentimentScores.filter(score => score < -0.3).length;
    
    // Calculate total mentions and engagements
    const totalMentions = data.reduce((sum, item) => sum + item.mentionCount, 0);
    const totalEngagements = data.reduce((sum, item) => sum + item.engagementCount, 0);
    
    // Extract top sources, key phrases, and influencers
    const sourceMap = new Map<string, number>();
    const keyPhraseMap = new Map<string, number>();
    const influencerMap = new Map<string, number>();
    
    data.forEach(item => {
      // Count sources
      if (sourceMap.has(item.source)) {
        sourceMap.set(item.source, sourceMap.get(item.source)! + 1);
      } else {
        sourceMap.set(item.source, 1);
      }
      
      // Count key phrases
      if (item.keyPhrases && item.keyPhrases.length) {
        item.keyPhrases.forEach(phrase => {
          if (keyPhraseMap.has(phrase)) {
            keyPhraseMap.set(phrase, keyPhraseMap.get(phrase)! + 1);
          } else {
            keyPhraseMap.set(phrase, 1);
          }
        });
      }
      
      // Count influencers
      if (item.topInfluencers) {
        Object.keys(item.topInfluencers).forEach((influencer: string) => {
          if (influencerMap.has(influencer)) {
            influencerMap.set(influencer, influencerMap.get(influencer)! + 1);
          } else {
            influencerMap.set(influencer, 1);
          }
        });
      }
    });
    
    // Sort and get top items
    const topSources = Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
      
    const topKeyPhrases = Array.from(keyPhraseMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
      
    const topInfluencers = Array.from(influencerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
    
    // Determine sentiment trend
    let sentimentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (data.length >= 3) {
      // Split data into two halves and compare average sentiment
      const midpoint = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, midpoint);
      const secondHalf = data.slice(midpoint);
      
      const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.sentimentScore, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.sentimentScore, 0) / secondHalf.length;
      
      const difference = secondHalfAvg - firstHalfAvg;
      if (difference > 0.1) {
        sentimentTrend = 'improving';
      } else if (difference < -0.1) {
        sentimentTrend = 'declining';
      }
    }
    
    return {
      averageScore: parseFloat(averageScore.toFixed(2)),
      positiveCount,
      neutralCount,
      negativeCount,
      totalMentions,
      totalEngagements,
      topSources,
      topKeyPhrases,
      topInfluencers,
      sentimentTrend
    };
  }
  
  /**
   * Get sentiment analysis for a specific source
   * @param tokenAddress Token address
   * @param source Sentiment source (e.g., 'twitter', 'reddit')
   * @param days Number of days to analyze
   * @returns Sentiment analysis for the specified source
   */
  async getSourceSentiment(tokenAddress: string, source: string, days: number = 30): Promise<any> {
    const cacheKey = `source-sentiment:${tokenAddress}:${source}:${days}`;
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const sentimentData = await this.marketSentimentRepository.find({
        where: {
          tokenAddress,
          source,
          timestamp: Between(fromDate, toDate)
        },
        order: {
          timestamp: 'ASC'
        }
      });
      
      if (!sentimentData || sentimentData.length === 0) {
        throw new NotFoundException(`No sentiment data found for ${tokenAddress} from ${source}`);
      }
      
      const result = {
        tokenAddress,
        source,
        period: {
          days,
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        },
        data: sentimentData,
        summary: this.calculateSentimentSummary(sentimentData)
      };
      
      await this.cacheService.set(cacheKey, result, 15 * 60); // Cache for 15 minutes
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error fetching source sentiment: ${err.message}`, err.stack);
      throw err;
    }
  }
}
