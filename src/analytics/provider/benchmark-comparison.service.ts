import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TokenPerformance } from '../entities/token-performance.entity';
import { AnalyticsCacheService } from './analytics-cache.service';

// Interface for benchmark comparison result
interface BenchmarkComparisonResult {
  tokenAddress: string;
  benchmarkAddress: string;
  period: string;
  timeframe: string;
  dateRange: {
    from: string;
    to: string;
  };
  tokenPerformance: {
    startPrice: number;
    endPrice: number;
    percentChange: number;
    volatility: number;
  };
  benchmarkPerformance: {
    startPrice: number;
    endPrice: number;
    percentChange: number;
    volatility: number;
  };
  comparison: {
    outperformance: number; // Percentage outperformance (positive) or underperformance (negative)
    relativeVolatility: number; // Ratio of token volatility to benchmark volatility
    beta: number; // Beta coefficient (sensitivity to benchmark movements)
    alpha: number; // Alpha (excess return over what would be predicted by beta)
    correlation: number; // Price correlation coefficient
  };
  calculatedAt: string;
}

// Interface for sector performance ranking
interface SectorPerformanceResult {
  sector: string;
  tokens: {
    tokenAddress: string;
    performance: number; // Percentage change
    rank: number;
  }[];
  period: string;
  timeframe: string;
  dateRange: {
    from: string;
    to: string;
  };
  calculatedAt: string;
}

@Injectable()
export class BenchmarkComparisonService {
  private readonly logger = new Logger(BenchmarkComparisonService.name);
  
  // Default benchmarks for cryptocurrency comparisons
  private readonly DEFAULT_BENCHMARKS = {
    BTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC on Ethereum
    ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
    TOP100: 'CRYPTO:TOP100', // Virtual index for top 100 cryptocurrencies
  };
  
  // Map of sectors to arrays of token addresses
  private readonly SECTOR_TOKENS: Record<string, string[]> = {
    'DeFi': [
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI
      '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', // AAVE
      '0xc00e94Cb662C3520282E6f5717214004A7f26888', // COMP
      '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', // MKR
    ],
    'Gaming': [
      '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b', // AXS
      '0xC1f976B91217E240885536aF8b63bc8b5269a9BE', // MANA
      '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', // SAND
    ],
    'Infrastructure': [
      '0x4d224452801ACEd8B2F0aebE155379bb5D594381', // APE
      '0x3845badAde8e6dFF049820680d1F14bD3903a5d0', // LINK
      '0x6810e776880C02933D47DB1b9fc05908e5386b96', // GNO
    ],
  };

  constructor(
    @InjectRepository(TokenPerformance)
    private readonly tokenPerformanceRepository: Repository<TokenPerformance>,
    private readonly cacheService: AnalyticsCacheService,
  ) {}

  /**
   * Parse period string to days
   * @param period Period string (e.g., '30d', '90d')
   * @returns Number of days
   */
  private parsePeriodToDays(period: string): number {
    if (!period) return 30; // Default to 30 days
    
    const match = period.match(/^(\d+)([dwmy])$/);
    if (!match) return 30;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return 30;
    }
  }
  
  /**
   * Get appropriate timeframe based on period length
   * @param days Number of days in period
   * @returns Appropriate timeframe
   */
  private getTimeframeForPeriod(days: number): string {
    if (days <= 7) return 'HOUR';
    if (days <= 30) return 'DAY';
    if (days <= 180) return 'WEEK';
    return 'MONTH';
  }

  /**
   * Calculate standard deviation (volatility) of returns
   * @param prices Array of prices
   * @returns Annualized volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i-1] !== 0) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
      } else {
        returns.push(0);
      }
    }
    
    // Calculate mean return
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    
    // Calculate sum of squared differences
    const squaredDiffs = returns.map(ret => Math.pow(ret - meanReturn, 2));
    const sumSquaredDiffs = squaredDiffs.reduce((sum, val) => sum + val, 0);
    
    // Calculate standard deviation
    const stdDev = Math.sqrt(sumSquaredDiffs / (returns.length - 1));
    
    // Annualize based on daily data (approximate)
    return stdDev * Math.sqrt(252); // Using 252 trading days per year
  }
  
  /**
   * Calculate beta coefficient (sensitivity to benchmark)
   * @param tokenReturns Array of token returns
   * @param benchmarkReturns Array of benchmark returns
   * @returns Beta coefficient
   */
  private calculateBeta(tokenReturns: number[], benchmarkReturns: number[]): number {
    if (tokenReturns.length !== benchmarkReturns.length || tokenReturns.length < 2) {
      return 0;
    }
    
    // Calculate covariance
    const tokenMean = tokenReturns.reduce((sum, val) => sum + val, 0) / tokenReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, val) => sum + val, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < tokenReturns.length; i++) {
      covariance += (tokenReturns[i] - tokenMean) * (benchmarkReturns[i] - benchmarkMean);
      benchmarkVariance += Math.pow(benchmarkReturns[i] - benchmarkMean, 2);
    }
    
    covariance /= tokenReturns.length;
    benchmarkVariance /= benchmarkReturns.length;
    
    // Beta = Covariance / Benchmark Variance
    return benchmarkVariance !== 0 ? covariance / benchmarkVariance : 0;
  }
  
  /**
   * Calculate Pearson correlation coefficient
   * @param x First array of values
   * @param y Second array of values
   * @returns Correlation coefficient (-1 to 1)
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) {
      return 0;
    }
    
    const n = x.length;
    
    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate sum of products of deviations
    let sumProductDeviations = 0;
    let sumSquaredDeviationsX = 0;
    let sumSquaredDeviationsY = 0;
    
    for (let i = 0; i < n; i++) {
      const deviationX = x[i] - meanX;
      const deviationY = y[i] - meanY;
      
      sumProductDeviations += deviationX * deviationY;
      sumSquaredDeviationsX += deviationX * deviationX;
      sumSquaredDeviationsY += deviationY * deviationY;
    }
    
    // Calculate correlation coefficient
    const denominator = Math.sqrt(sumSquaredDeviationsX * sumSquaredDeviationsY);
    return denominator !== 0 ? sumProductDeviations / denominator : 0;
  }

  /**
   * Compare token performance against a benchmark token
   * @param tokenAddress Address of the token to analyze
   * @param benchmarkAddress Address of the benchmark token (or predefined key like 'BTC', 'ETH')
   * @param period Time period for analysis (e.g., '30d', '90d')
   * @returns Detailed comparison of performance metrics
   */
  async compareToBenchmark(
    tokenAddress: string,
    benchmarkAddress: string = 'BTC',
    period: string = '30d',
  ): Promise<BenchmarkComparisonResult> {
    // Resolve benchmark address if a key was provided
    const resolvedBenchmarkAddress = this.DEFAULT_BENCHMARKS[benchmarkAddress as keyof typeof this.DEFAULT_BENCHMARKS] || benchmarkAddress;
    
    const cacheKey = `benchmark-comparison:${tokenAddress}:${resolvedBenchmarkAddress}:${period}`;
    const cachedData = await this.cacheService.get<BenchmarkComparisonResult>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    try {
      // Parse period and determine date range
      const days = this.parsePeriodToDays(period);
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Determine appropriate timeframe
      const timeframe = this.getTimeframeForPeriod(days);
      
      // Fetch token and benchmark price data
      const [tokenData, benchmarkData] = await Promise.all([
        this.tokenPerformanceRepository.find({
          where: {
            tokenAddress,
            timeframe,
            timestamp: Between(fromDate, toDate),
          },
          order: { timestamp: 'ASC' },
          select: ['timestamp', 'price'],
        }),
        this.tokenPerformanceRepository.find({
          where: {
            tokenAddress: resolvedBenchmarkAddress,
            timeframe,
            timestamp: Between(fromDate, toDate),
          },
          order: { timestamp: 'ASC' },
          select: ['timestamp', 'price'],
        }),
      ]);
      
      if (tokenData.length < 2) {
        throw new NotFoundException(`Insufficient data for token ${tokenAddress}`);
      }
      
      if (benchmarkData.length < 2) {
        throw new NotFoundException(`Insufficient data for benchmark ${benchmarkAddress}`);
      }
      
      // Extract price series
      const tokenPrices = tokenData.map(item => item.price);
      const benchmarkPrices = benchmarkData.map(item => item.price);
      
      // Calculate percentage changes
      const tokenStartPrice = tokenPrices[0];
      const tokenEndPrice = tokenPrices[tokenPrices.length - 1];
      const tokenPercentChange = ((tokenEndPrice - tokenStartPrice) / tokenStartPrice) * 100;
      
      const benchmarkStartPrice = benchmarkPrices[0];
      const benchmarkEndPrice = benchmarkPrices[benchmarkPrices.length - 1];
      const benchmarkPercentChange = ((benchmarkEndPrice - benchmarkStartPrice) / benchmarkStartPrice) * 100;
      
      // Calculate volatilities
      const tokenVolatility = this.calculateVolatility(tokenPrices);
      const benchmarkVolatility = this.calculateVolatility(benchmarkPrices);
      
      // Calculate outperformance
      const outperformance = tokenPercentChange - benchmarkPercentChange;
      
      // Calculate returns for beta and correlation
      const tokenReturns: number[] = [];
      const benchmarkReturns: number[] = [];
      
      for (let i = 1; i < tokenPrices.length; i++) {
        if (tokenPrices[i-1] !== 0 && benchmarkPrices[i-1] !== 0) {
          tokenReturns.push((tokenPrices[i] - tokenPrices[i-1]) / tokenPrices[i-1]);
          benchmarkReturns.push((benchmarkPrices[i] - benchmarkPrices[i-1]) / benchmarkPrices[i-1]);
        }
      }
      
      // Calculate beta
      const beta = this.calculateBeta(tokenReturns, benchmarkReturns);
      
      // Calculate alpha (excess return over what would be predicted by beta)
      // Using CAPM: Expected Return = Risk-Free Rate + Beta * (Benchmark Return - Risk-Free Rate)
      const riskFreeRate = 0.02 / 365 * days; // Assuming 2% annual risk-free rate
      const expectedReturn = riskFreeRate + beta * (benchmarkPercentChange - riskFreeRate);
      const alpha = tokenPercentChange - expectedReturn;
      
      // Calculate correlation
      const correlation = this.calculateCorrelation(tokenReturns, benchmarkReturns);
      
      // Prepare result
      const result: BenchmarkComparisonResult = {
        tokenAddress,
        benchmarkAddress: resolvedBenchmarkAddress,
        period,
        timeframe,
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        tokenPerformance: {
          startPrice: tokenStartPrice,
          endPrice: tokenEndPrice,
          percentChange: tokenPercentChange,
          volatility: tokenVolatility,
        },
        benchmarkPerformance: {
          startPrice: benchmarkStartPrice,
          endPrice: benchmarkEndPrice,
          percentChange: benchmarkPercentChange,
          volatility: benchmarkVolatility,
        },
        comparison: {
          outperformance,
          relativeVolatility: benchmarkVolatility !== 0 ? tokenVolatility / benchmarkVolatility : 0,
          beta,
          alpha,
          correlation,
        },
        calculatedAt: new Date().toISOString(),
      };
      
      // Cache the result
      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      if (error instanceof Error) {
        this.logger.error(`Error comparing to benchmark: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error comparing to benchmark: ${String(error)}`);
      }
      
      throw new Error(`Failed to compare token to benchmark: ${String(error)}`);
    }
  }

  /**
   * Get performance ranking within a sector
   * @param sector Sector name (e.g., 'DeFi', 'Gaming')
   * @param period Time period for analysis
   * @returns Performance ranking of tokens within the sector
   */
  async getSectorPerformance(
    sector: string,
    period: string = '30d',
  ): Promise<SectorPerformanceResult> {
    const cacheKey = `sector-performance:${sector}:${period}`;
    const cachedData = await this.cacheService.get<SectorPerformanceResult>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    try {
      // Check if sector exists
      const sectorTokens = this.SECTOR_TOKENS[sector];
      if (!sectorTokens || sectorTokens.length === 0) {
        throw new BadRequestException(`Invalid sector: ${sector}`);
      }
      
      // Parse period and determine date range
      const days = this.parsePeriodToDays(period);
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Determine appropriate timeframe
      const timeframe = this.getTimeframeForPeriod(days);
      
      // Get performance data for all tokens in the sector
      const tokenPerformances = await Promise.all(
        sectorTokens.map(async (tokenAddress) => {
          try {
            // Get first and last price points
            const [firstDataPoint, lastDataPoint] = await Promise.all([
              this.tokenPerformanceRepository.findOne({
                where: {
                  tokenAddress,
                  timeframe,
                  timestamp: Between(fromDate, new Date(fromDate.getTime() + 24 * 60 * 60 * 1000)),
                },
                order: { timestamp: 'ASC' },
                select: ['price'],
              }),
              this.tokenPerformanceRepository.findOne({
                where: {
                  tokenAddress,
                  timeframe,
                  timestamp: Between(new Date(toDate.getTime() - 24 * 60 * 60 * 1000), toDate),
                },
                order: { timestamp: 'DESC' },
                select: ['price'],
              }),
            ]);
            
            if (!firstDataPoint || !lastDataPoint) {
              return { tokenAddress, performance: 0 };
            }
            
            // Calculate percentage change
            const startPrice = firstDataPoint.price;
            const endPrice = lastDataPoint.price;
            const percentChange = startPrice !== 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
            
            return { tokenAddress, performance: percentChange };
          } catch (error) {
            this.logger.warn(`Error fetching data for token ${tokenAddress}: ${String(error)}`);
            return { tokenAddress, performance: 0 };
          }
        })
      );
      
      // Sort by performance (descending) and assign ranks
      const sortedPerformances = [...tokenPerformances].sort((a, b) => b.performance - a.performance);
      const rankedTokens = sortedPerformances.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
      
      // Prepare result
      const result: SectorPerformanceResult = {
        sector,
        tokens: rankedTokens,
        period,
        timeframe,
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
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      if (error instanceof Error) {
        this.logger.error(`Error calculating sector performance: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error calculating sector performance: ${String(error)}`);
      }
      
      throw new Error(`Failed to calculate sector performance: ${String(error)}`);
    }
  }

  /**
   * Get list of available sectors for performance comparison
   * @returns List of available sectors
   */
  async getAvailableSectors(): Promise<string[]> {
    return Object.keys(this.SECTOR_TOKENS);
  }
}
