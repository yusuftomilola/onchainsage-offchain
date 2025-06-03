import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TokenPerformance } from '../entities/token-performance.entity';
import { AnalyticsCacheService } from '.';

@Injectable()
export class TokenPerformanceService {
  private readonly logger = new Logger(TokenPerformanceService.name);

  constructor(
    @InjectRepository(TokenPerformance)
    private readonly tokenPerformanceRepository: Repository<TokenPerformance>,
    private readonly cacheService: AnalyticsCacheService,
  ) {}

  /**
   * Get token performance analytics.
   * @param tokenAddress The address of the token.
   * @param from Start date (ISO 8601).
   * @param to End date (ISO 8601).
   * @param granularity Time granularity (1h, 1d, 1w, 1m).
   * @returns Performance data for the token.
   */
  async getPerformance(tokenAddress: string, from?: string, to?: string, granularity: string = '1d'): Promise<any> {
    const cacheKey = `token-performance:${tokenAddress}:${from}:${to}:${granularity}`;
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    this.logger.log(
      `Fetching token performance for ${tokenAddress}, from: ${from}, to: ${to}, granularity: ${granularity}`,
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
      
      // Query the database
      const performanceData = await this.tokenPerformanceRepository.find({
        where: {
          tokenAddress,
          timeframe,
          timestamp: Between(fromDate, toDate)
        },
        order: {
          timestamp: 'ASC'
        }
      });
      
      if (!performanceData || performanceData.length === 0) {
        return {
          tokenAddress,
          granularity,
          message: 'No performance data found for the specified parameters',
          data: []
        };
      }
      
      // Transform data for response
      const result = {
        tokenAddress,
        granularity,
        dataPoints: performanceData.length,
        timeframe,
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        },
        data: performanceData.map(item => ({
          timestamp: item.timestamp,
          price: item.price,
          volume: item.volume24h,
          volumeChangePercent: item.volumeChangePercent24h,
          priceChangePercent: item.priceChangePercent24h,
          liquidity: item.liquidity,
          marketCap: item.marketCap,
          highPrice: item.high24h,
          lowPrice: item.low24h,
          txCount: item.txCount24h,
          holderCount: item.holderCount
        })),
        summary: this.calculatePerformanceSummary(performanceData)
      };
      
      // Cache the result
      const cacheTTL = this.getCacheTTLForGranularity(granularity);
      await this.cacheService.set(cacheKey, result, cacheTTL);
      
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error fetching token performance: ${err.message}`, err.stack);
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
   * Calculate performance summary metrics from token data
   * @param data Array of token performance data points
   * @returns Summary metrics object
   */
  private calculatePerformanceSummary(data: TokenPerformance[]): any {
    if (!data || data.length === 0) {
      return {};
    }
    
    // Extract price data for calculations
    const prices = data.map(item => item.price);
    const volumes = data.map(item => item.volume24h);
    
    // Calculate price metrics
    const latestPrice = prices[prices.length - 1];
    const oldestPrice = prices[0];
    const priceChange = latestPrice - oldestPrice;
    const priceChangePercent = oldestPrice !== 0 ? (priceChange / oldestPrice) * 100 : 0;
    
    // Calculate min/max prices
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    
    // Calculate average volume
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    
    // Calculate volatility (standard deviation of price)
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance);
    
    return {
      priceChange,
      priceChangePercent: parseFloat(priceChangePercent.toFixed(2)),
      maxPrice,
      minPrice,
      avgPrice: parseFloat(avgPrice.toFixed(2)),
      avgVolume: parseFloat(avgVolume.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
      dataPoints: data.length,
      startDate: data[0].timestamp,
      endDate: data[data.length - 1].timestamp
    };
  }
  
  /**
   * Get price change percentage over a specific period
   * @param tokenAddress Token address
   * @param period Period in days
   * @returns Price change percentage
   */
  async getPriceChangePercent(tokenAddress: string, period: number = 30): Promise<number> {
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - period * 24 * 60 * 60 * 1000);
    
    try {
      const [oldestRecord, latestRecord] = await Promise.all([
        this.tokenPerformanceRepository.findOne({
          where: { 
            tokenAddress,
            timeframe: 'DAY',
            timestamp: Between(fromDate, new Date(fromDate.getTime() + 24 * 60 * 60 * 1000))
          },
          order: { timestamp: 'ASC' }
        }),
        this.tokenPerformanceRepository.findOne({
          where: { 
            tokenAddress,
            timeframe: 'DAY',
            timestamp: Between(new Date(toDate.getTime() - 24 * 60 * 60 * 1000), toDate)
          },
          order: { timestamp: 'DESC' }
        })
      ]);
      
      if (!oldestRecord || !latestRecord) {
        return 0;
      }
      
      const priceChange = latestRecord.price - oldestRecord.price;
      const priceChangePercent = oldestRecord.price !== 0 ? (priceChange / oldestRecord.price) * 100 : 0;
      
      return parseFloat(priceChangePercent.toFixed(2));
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error calculating price change: ${err.message}`, err.stack);
      return 0;
    }
  }
}
