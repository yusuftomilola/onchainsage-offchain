import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { VolatilityMetric } from '../entities/volatility-metric.entity';
import { TokenPerformance } from '../entities/token-performance.entity';
import { AnalyticsCacheService } from './analytics-cache.service';

export interface VolatilityResult {
  tokenAddress: string;
  period: string;
  timeframe: string;
  standardDeviation: number;
  averageTrueRange: number;
  beta?: number;
  sharpeRatio?: number;
  valueAtRisk?: number;
  maxDrawdown?: number;
  volatilityRank?: number;
  sampleSize: number;
  calculatedAt: string;
  historicalData?: {
    timestamp: Date;
    value: number;
  }[];
}

@Injectable()
export class VolatilityService {
  private readonly logger = new Logger(VolatilityService.name);

  constructor(
    @InjectRepository(VolatilityMetric)
    private readonly volatilityMetricRepository: Repository<VolatilityMetric>,
    @InjectRepository(TokenPerformance)
    private readonly tokenPerformanceRepository: Repository<TokenPerformance>, // For fetching price data
    private readonly cacheService: AnalyticsCacheService,
  ) {}

  /**
   * Get volatility calculations and risk metrics for a token.
   * @param tokenAddress The address of the token.
   * @param period Calculation period (e.g., 30d, 90d).
   * @param includeHistorical Whether to include historical data points in the response.
   * @returns Volatility and risk metrics.
   */
  async getVolatility(
    tokenAddress: string, 
    period: string = '30d',
    includeHistorical: boolean = false
  ): Promise<VolatilityResult> {
    const cacheKey = `volatility:${tokenAddress}:${period}:${includeHistorical}`;
    const cachedData = await this.cacheService.get<VolatilityResult>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    this.logger.log(`Calculating volatility for token: ${tokenAddress}, period: ${period}`);
    
    try {
      // Parse period string to get number of days
      const days = this.parsePeriodToDays(period);
      
      // Calculate date range
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Determine appropriate timeframe based on period length
      const timeframe = this.getTimeframeForPeriod(days);
      
      // First check if we have a pre-calculated volatility metric
      const existingMetric = await this.volatilityMetricRepository.findOne({
        where: {
          tokenAddress,
          timeframe,
          timestamp: LessThan(toDate)
        },
        order: {
          timestamp: 'DESC'
        }
      });
      
      // If we have a recent calculation (less than 24 hours old) and it's for the right period, use it
      if (existingMetric && 
          existingMetric.calculatedAt && 
          (toDate.getTime() - existingMetric.calculatedAt.getTime() < 24 * 60 * 60 * 1000)) {
        
        const result: VolatilityResult = {
          tokenAddress,
          period,
          timeframe,
          standardDeviation: existingMetric.standardDeviation,
          averageTrueRange: existingMetric.averageTrueRange,
          beta: existingMetric.beta,
          sharpeRatio: existingMetric.sharpeRatio,
          valueAtRisk: existingMetric.valueAtRisk,
          maxDrawdown: existingMetric.maxDrawdown,
          volatilityRank: existingMetric.volatilityRank,
          sampleSize: existingMetric.sampleSize,
          calculatedAt: existingMetric.calculatedAt.toISOString()
        };
        
        // If historical data is requested, fetch it
        if (includeHistorical) {
          const historicalPrices = await this.tokenPerformanceRepository.find({
            where: {
              tokenAddress,
              timeframe,
              timestamp: Between(fromDate, toDate)
            },
            order: {
              timestamp: 'ASC'
            },
            select: ['timestamp', 'price']
          });
          
          result.historicalData = historicalPrices.map(item => ({
            timestamp: item.timestamp,
            value: item.price
          }));
        }
        
        // Cache the result
        await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
        return result;
      }
      
      // If we don't have a recent calculation, fetch price data and calculate volatility
      const priceData = await this.tokenPerformanceRepository.find({
        where: {
          tokenAddress,
          timeframe,
          timestamp: Between(fromDate, toDate)
        },
        order: {
          timestamp: 'ASC'
        }
      });
      
      if (!priceData || priceData.length < 2) {
        throw new NotFoundException(`Insufficient price data for ${tokenAddress} over the specified period`);
      }
      
      // Calculate returns (percentage change between consecutive prices)
      const returns: number[] = [];
      const prices = priceData.map(item => item.price);
      const highPrices = priceData.map(item => item.high24h || item.price);
      const lowPrices = priceData.map(item => item.low24h || item.price);
      
      for (let i = 1; i < prices.length; i++) {
        if (prices[i-1] !== 0) {
          returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        } else {
          returns.push(0);
        }
      }
      
      // Calculate standard deviation of returns
      const standardDeviation = this.calculateStandardDeviation(returns);
      
      // Calculate Average True Range (ATR)
      const atr = this.calculateATR(prices, highPrices, lowPrices);
      
      // Calculate maximum drawdown
      const maxDrawdown = this.calculateMaxDrawdown(prices);
      
      // Calculate Value at Risk (VaR) at 95% confidence level
      const valueAtRisk = this.calculateValueAtRisk(returns, 0.95);
      
      // Create new volatility metric entity
      const newMetric = new VolatilityMetric();
      newMetric.tokenAddress = tokenAddress;
      newMetric.timeframe = timeframe;
      newMetric.standardDeviation = standardDeviation;
      newMetric.averageTrueRange = atr;
      newMetric.maxDrawdown = maxDrawdown;
      newMetric.valueAtRisk = valueAtRisk;
      newMetric.sampleSize = priceData.length;
      newMetric.calculatedAt = new Date();
      
      // Save the new metric
      await this.volatilityMetricRepository.save(newMetric);
      
      // Prepare result
      const result: VolatilityResult = {
        tokenAddress,
        period,
        timeframe,
        standardDeviation,
        averageTrueRange: atr,
        maxDrawdown,
        valueAtRisk,
        sampleSize: priceData.length,
        calculatedAt: newMetric.calculatedAt.toISOString()
      };
      
      // Include historical data if requested
      if (includeHistorical) {
        result.historicalData = priceData.map(item => ({
          timestamp: item.timestamp,
          value: item.price
        }));
      }
      
      // Cache the result
      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error calculating volatility: ${err.message}`, err.stack);
      throw err;
    }
  }

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
   * Calculate standard deviation of a dataset
   * @param data Array of numbers
   * @returns Standard deviation
   */
  private calculateStandardDeviation(data: number[]): number {
    if (!data || data.length < 2) {
      return 0;
    }
    
    // Calculate mean
    const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
    
    // Calculate sum of squared differences
    const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
    const sumSquaredDiffs = squaredDiffs.reduce((sum, value) => sum + value, 0);
    
    // Calculate variance and standard deviation
    const variance = sumSquaredDiffs / (data.length - 1); // Use n-1 for sample standard deviation
    return Math.sqrt(variance);
  }
  
  /**
   * Calculate Average True Range (ATR) - a volatility indicator
   * @param prices Array of closing prices
   * @param highPrices Array of high prices
   * @param lowPrices Array of low prices
   * @param period Period for ATR calculation (default: 14)
   * @returns ATR value
   */
  private calculateATR(prices: number[], highPrices: number[], lowPrices: number[], period: number = 14): number {
    if (!prices || prices.length < 2 || prices.length !== highPrices.length || prices.length !== lowPrices.length) {
      return 0;
    }
    
    // Calculate True Range series
    const trueRanges: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const previousClose = prices[i - 1];
      const high = highPrices[i];
      const low = lowPrices[i];
      
      // True Range is the greatest of:
      // 1. Current high - current low
      // 2. Absolute value of current high - previous close
      // 3. Absolute value of current low - previous close
      const tr1 = high - low;
      const tr2 = Math.abs(high - previousClose);
      const tr3 = Math.abs(low - previousClose);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    // Use simple moving average for ATR calculation
    const periodTrueRanges = trueRanges.slice(-period);
    if (periodTrueRanges.length === 0) {
      return 0;
    }
    
    return periodTrueRanges.reduce((sum, tr) => sum + tr, 0) / periodTrueRanges.length;
  }
  
  /**
   * Calculate maximum drawdown from price series
   * @param prices Array of prices
   * @returns Maximum drawdown as a decimal (e.g., 0.25 for 25% drawdown)
   */
  private calculateMaxDrawdown(prices: number[]): number {
    if (!prices || prices.length < 2) {
      return 0;
    }
    
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > peak) {
        peak = prices[i];
      } else {
        const drawdown = (peak - prices[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown;
  }
  
  /**
   * Calculate Value at Risk (VaR) using historical simulation method
   * @param returns Array of historical returns
   * @param confidenceLevel Confidence level (e.g., 0.95 for 95%)
   * @returns VaR value
   */
  private calculateValueAtRisk(returns: number[], confidenceLevel: number): number {
    if (!returns || returns.length < 10) {
      return 0;
    }
    
    // Sort returns in ascending order
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    // Find the index corresponding to the confidence level
    const index = Math.floor(sortedReturns.length * (1 - confidenceLevel));
    
    // Return the VaR (as a positive number)
    return Math.abs(sortedReturns[index]);
  }
  
  /**
   * Compare volatility between tokens
   * @param tokenAddresses Array of token addresses
   * @param period Period for volatility calculation
   * @returns Comparison of volatility metrics
   */
  async compareVolatility(tokenAddresses: string[], period: string = '30d'): Promise<any> {
    try {
      const volatilityPromises = tokenAddresses.map(address => this.getVolatility(address, period));
      const results = await Promise.all(volatilityPromises);
      
      // Sort by standard deviation (most volatile first)
      results.sort((a, b) => b.standardDeviation - a.standardDeviation);
      
      // Add rank property
      const rankedResults = results.map((result, index) => ({
        ...result,
        volatilityRank: index + 1
      }));
      
      return {
        period,
        tokens: rankedResults,
        timestamp: new Date().toISOString()
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Error comparing token volatility: ${err.message}`, err.stack);
      throw err;
    }
  }
}
