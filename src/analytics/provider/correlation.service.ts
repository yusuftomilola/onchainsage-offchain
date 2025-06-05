import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TokenPerformance } from '../entities/token-performance.entity';
import { MarketSentiment } from '../entities/market-sentiment.entity';
import { AnalyticsCacheService } from './analytics-cache.service';

export interface CorrelationResult {
  tokenA?: string;
  tokenB?: string;
  tokenAddress?: string;
  sentimentSource?: string;
  period: string;
  timeframe: string;
  correlation: number;
  pValue: number;
  significant: boolean;
  dataPoints: number;
  dateRange: {
    from: string;
    to: string;
  };
  calculatedAt: string;
}

@Injectable()
export class CorrelationService {
  private readonly logger = new Logger(CorrelationService.name);
  private readonly MIN_DATA_POINTS = 10;
  private readonly SIGNIFICANCE_LEVEL = 0.05;

  constructor(
    @InjectRepository(TokenPerformance)
    private readonly tokenPerformanceRepository: Repository<TokenPerformance>,
    @InjectRepository(MarketSentiment)
    private readonly marketSentimentRepository: Repository<MarketSentiment>,
    private readonly cacheService: AnalyticsCacheService,
  ) {}
  
  /**
   * Parse period string to number of days
   * @param period Period string (e.g., '30d', '90d', '1y')
   * @returns Number of days
   */
  private parsePeriodToDays(period: string): number {
    const match = period.match(/^(\d+)([dwmy])$/);
    if (!match) {
      return 30; // Default to 30 days if invalid format
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 'd': return value; // Days
      case 'w': return value * 7; // Weeks
      case 'm': return value * 30; // Months (approximate)
      case 'y': return value * 365; // Years (approximate)
      default: return 30;
    }
  }
  
  /**
   * Get appropriate timeframe based on period length
   * @param days Period length in days
   * @returns Timeframe string
   */
  private getTimeframeForPeriod(days: number): string {
    if (days <= 7) {
      return 'HOUR';
    } else if (days <= 90) {
      return 'DAY';
    } else if (days <= 365) {
      return 'WEEK';
    } else {
      return 'MONTH';
    }
  }
  
  /**
   * Get price data for a token within a specific date range and timeframe
   */
  private async getTokenPriceData(
    tokenAddress: string,
    fromDate: Date,
    toDate: Date,
    timeframe: string
  ): Promise<TokenPerformance[]> {
    return this.tokenPerformanceRepository.find({
      where: {
        tokenAddress,
        timeframe,
        timestamp: Between(fromDate, toDate)
      },
      order: { timestamp: 'ASC' },
      select: ['timestamp', 'price', 'volume24h']
    });
  }
  
  /**
   * Calculate returns from price series
   */
  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i-1] !== 0) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
      } else {
        returns.push(0);
      }
    }
    return returns;
  }
  
  /**
   * Align price data from two tokens by timestamp
   */
  private alignPriceData(
    pricesA: TokenPerformance[],
    pricesB: TokenPerformance[]
  ): Array<{timestamp: Date, priceA: number, priceB: number}> {
    const timestampMapA = new Map<string, number>();
    const timestampMapB = new Map<string, number>();
    
    // Create maps of timestamps to prices
    pricesA.forEach(item => timestampMapA.set(item.timestamp.toISOString(), item.price));
    pricesB.forEach(item => timestampMapB.set(item.timestamp.toISOString(), item.price));
    
    // Find common timestamps and align data
    const alignedData: Array<{timestamp: Date, priceA: number, priceB: number}> = [];
    
    // Use timestamps from A and check if they exist in B
    pricesA.forEach(itemA => {
      const timestamp = itemA.timestamp.toISOString();
      if (timestampMapB.has(timestamp)) {
        const priceB = timestampMapB.get(timestamp);
        if (priceB !== undefined) {
          alignedData.push({
            timestamp: itemA.timestamp,
            priceA: itemA.price,
            priceB: priceB
          });
        }
      }
    });
    
    return alignedData;
  }
  
  /**
   * Calculate Pearson correlation coefficient and p-value
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): { correlation: number, pValue: number } {
    if (x.length !== y.length || x.length < this.MIN_DATA_POINTS) {
      return { correlation: 0, pValue: 1 };
    }
    
    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    // Calculate sums for correlation formula
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;
    
    for (let i = 0; i < x.length; i++) {
      const xDiff = x[i] - meanX;
      const yDiff = y[i] - meanY;
      sumXY += xDiff * yDiff;
      sumX2 += xDiff * xDiff;
      sumY2 += yDiff * yDiff;
    }
    
    // Calculate Pearson correlation coefficient
    const correlation = sumXY / (Math.sqrt(sumX2) * Math.sqrt(sumY2));
    
    // Calculate p-value using t-distribution
    const t = correlation * Math.sqrt((x.length - 2) / (1 - correlation * correlation));
    const pValue = this.calculateTDistPValue(t, x.length - 2);
    
    return { correlation, pValue };
  }
  
  /**
   * Calculate p-value from t-statistic (approximation)
   */
  private calculateTDistPValue(t: number, df: number): number {
    // Simple approximation for p-value calculation
    // For more accurate calculation, a proper t-distribution implementation should be used
    t = Math.abs(t);
    const x = df / (df + t * t);
    let p = 1 - 0.5 * Math.pow(x, df / 2);
    return p * 2; // Two-tailed test
  }

  /**
   * Get correlation analysis between social sentiment and price movements.
   * @param tokenAddress The address of the token.
   * @param sentimentSource Sentiment source (e.g., twitter).
   * @param period Correlation period (e.g., 7d, 30d).
   * @returns Correlation data.
   */
  async getSentimentPriceCorrelation(
    tokenAddress: string,
    sentimentSource: string,
    period: string = '30d',
  ): Promise<CorrelationResult> {
    const cacheKey = `correlation:sentiment-price:${tokenAddress}:${sentimentSource}:${period}`;
    const cachedData = await this.cacheService.get<CorrelationResult>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    this.logger.log(
      `Calculating sentiment-price correlation for token: ${tokenAddress}, source: ${sentimentSource}, period: ${period}`,
    );
    
    try {
      // Parse period and calculate date range
      const days = this.parsePeriodToDays(period);
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Get appropriate timeframe
      const timeframe = this.getTimeframeForPeriod(days);
      
      // Fetch price data
      const priceData = await this.getTokenPriceData(tokenAddress, fromDate, toDate, timeframe);
      
      // Fetch sentiment data
      const sentimentData = await this.marketSentimentRepository.find({
        where: {
          tokenAddress,
          source: sentimentSource,
          timestamp: Between(fromDate, toDate),
        },
        order: { timestamp: 'ASC' },
      });
      
      if (priceData.length < this.MIN_DATA_POINTS || sentimentData.length < this.MIN_DATA_POINTS) {
        throw new NotFoundException(`Insufficient data points for correlation analysis. Price data: ${priceData.length}, Sentiment data: ${sentimentData.length}`);
      }
      
      // Align price and sentiment data by timestamp
      const timestampMapPrice = new Map<string, number>();
      const timestampMapSentiment = new Map<string, number>();
      
      // Create maps with date string keys for easier matching
      priceData.forEach(item => {
        const dateKey = item.timestamp.toISOString().split('T')[0]; // Just use the date part
        timestampMapPrice.set(dateKey, item.price);
      });
      
      sentimentData.forEach(item => {
        const dateKey = item.timestamp.toISOString().split('T')[0];
        // Use sentiment score as the value
        timestampMapSentiment.set(dateKey, item.sentimentScore);
      });
      
      // Align data by date
      const alignedPrices: number[] = [];
      const alignedSentiments: number[] = [];
      const alignedDates: string[] = [];
      
      // Find dates that have both price and sentiment data
      Array.from(timestampMapPrice.keys()).forEach(dateKey => {
        const price = timestampMapPrice.get(dateKey);
        const sentiment = timestampMapSentiment.get(dateKey);
        
        if (price !== undefined && sentiment !== undefined) {
          alignedPrices.push(price);
          alignedSentiments.push(sentiment);
          alignedDates.push(dateKey);
        }
      });
      
      if (alignedPrices.length < this.MIN_DATA_POINTS) {
        throw new NotFoundException(`Insufficient aligned data points for correlation analysis: ${alignedPrices.length}`);
      }
      
      // Calculate returns for prices (daily changes)
      const priceReturns = this.calculateReturns(alignedPrices);
      
      // We don't calculate returns for sentiment, we use raw scores
      // But we need to align the arrays by removing the first element from sentiment data
      const alignedSentimentsForCorrelation = alignedSentiments.slice(1);
      
      // Calculate correlation
      const { correlation, pValue } = this.calculatePearsonCorrelation(
        priceReturns,
        alignedSentimentsForCorrelation
      );
      
      // Prepare result
      const result: CorrelationResult = {
        tokenAddress,
        sentimentSource,
        period,
        timeframe,
        correlation,
        pValue,
        significant: pValue < this.SIGNIFICANCE_LEVEL,
        dataPoints: alignedPrices.length - 1, // -1 because we use returns
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        calculatedAt: new Date().toISOString(),
      };
      
      // Cache the result
      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error calculating sentiment-price correlation: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error calculating sentiment-price correlation: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Calculate correlation between two tokens' price movements
   * @param tokenA First token address
   * @param tokenB Second token address
   * @param period Time period for analysis (e.g., '30d', '90d')
   * @param timeframe Optional specific timeframe to use
   * @returns Correlation result with statistical significance
   */
  async getPriceCorrelation(
    tokenA: string,
    tokenB: string,
    period: string = '30d',
    timeframe?: string,
  ): Promise<CorrelationResult> {
    const cacheKey = `correlation:price:${tokenA}:${tokenB}:${period}:${timeframe || 'auto'}`;
    const cachedData = await this.cacheService.get<CorrelationResult>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    try {
      // Parse period and calculate date range
      const days = this.parsePeriodToDays(period);
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Determine appropriate timeframe if not provided
      const calculatedTimeframe = timeframe || this.getTimeframeForPeriod(days);
      
      // Fetch price data for both tokens
      const [pricesA, pricesB] = await Promise.all([
        this.getTokenPriceData(tokenA, fromDate, toDate, calculatedTimeframe),
        this.getTokenPriceData(tokenB, fromDate, toDate, calculatedTimeframe)
      ]);

      if (pricesA.length < this.MIN_DATA_POINTS || pricesB.length < this.MIN_DATA_POINTS) {
        throw new NotFoundException(`Insufficient data points for correlation analysis. Token A: ${pricesA.length}, Token B: ${pricesB.length}`);
      }
      
      // Align price data by timestamp
      const alignedData = this.alignPriceData(pricesA, pricesB);
      
      if (alignedData.length < this.MIN_DATA_POINTS) {
        throw new NotFoundException(`Insufficient aligned data points for correlation analysis: ${alignedData.length}`);
      }

      // Calculate returns
      const returnsA = this.calculateReturns(alignedData.map(d => d.priceA));
      const returnsB = this.calculateReturns(alignedData.map(d => d.priceB));

      // Calculate correlation and p-value
      const { correlation, pValue } = this.calculatePearsonCorrelation(returnsA, returnsB);

      const result: CorrelationResult = {
        tokenA,
        tokenB,
        period,
        timeframe: calculatedTimeframe,
        correlation,
        pValue,
        significant: pValue < this.SIGNIFICANCE_LEVEL,
        dataPoints: alignedData.length - 1, // -1 because we use returns
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        calculatedAt: new Date().toISOString(),
      };

      // Cache the result for 1 hour
      await this.cacheService.set(cacheKey, result, 3600);
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error calculating price correlation: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error calculating price correlation: ${String(error)}`);
      }
      throw error;
    }
  }
  
  /**
   * Calculate correlation between trading volume and price volatility
   * @param tokenAddress Token address
   * @param period Time period for analysis
   * @returns Correlation between volume and volatility
   */
  async getVolumeVolatilityCorrelation(
    tokenAddress: string,
    period: string = '30d',
  ): Promise<CorrelationResult> {
    const cacheKey = `correlation:volume-volatility:${tokenAddress}:${period}`;
    const cachedData = await this.cacheService.get<CorrelationResult>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    try {
      // Parse period and calculate date range
      const days = this.parsePeriodToDays(period);
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Get appropriate timeframe
      const timeframe = this.getTimeframeForPeriod(days);
      
      // Fetch price and volume data
      const data = await this.tokenPerformanceRepository.find({
        where: {
          tokenAddress,
          timeframe,
          timestamp: Between(fromDate, toDate)
        },
        order: { timestamp: 'ASC' },
        select: ['timestamp', 'price', 'volume24h']
      });
      
      if (data.length < this.MIN_DATA_POINTS) {
        throw new NotFoundException(`Insufficient data points for correlation analysis: ${data.length}`);
      }
      
      // Extract price and volume series
      const prices = data.map(item => item.price);
      const volumes = data.map(item => item.volume24h || 0); // Handle null volumes
      
      // Calculate daily price changes (percent)
      const priceChanges: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        if (prices[i-1] !== 0) {
          const pctChange = Math.abs((prices[i] - prices[i-1]) / prices[i-1]); // Use absolute change as volatility
          priceChanges.push(pctChange);
        } else {
          priceChanges.push(0);
        }
      }
      
      // We need to align the arrays by removing the first element from volumes
      const volumesAligned = volumes.slice(1);
      
      // Calculate correlation between volume and next-day price volatility
      const { correlation, pValue } = this.calculatePearsonCorrelation(volumesAligned, priceChanges);
      
      const result: CorrelationResult = {
        tokenAddress,
        period,
        timeframe,
        correlation,
        pValue,
        significant: pValue < this.SIGNIFICANCE_LEVEL,
        dataPoints: priceChanges.length,
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        calculatedAt: new Date().toISOString(),
      };
      
      // Cache the result
      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error calculating volume-volatility correlation: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error calculating volume-volatility correlation: ${String(error)}`);
      }
      throw error;
    }
  }
}
