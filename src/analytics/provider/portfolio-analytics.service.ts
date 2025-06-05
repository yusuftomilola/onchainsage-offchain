import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { TokenPerformance } from '../entities/token-performance.entity';
import { AnalyticsCacheService } from './analytics-cache.service';

interface PortfolioPerformanceResult {
  userId: string;
  period: {
    from: string;
    to: string;
  };
  granularity: string;
  totalValue: number;
  totalValueChange: {
    amount: number;
    percentage: number;
  };
  holdings: PortfolioHolding[];
  performanceData: PortfolioTimeseriesData[];
  metrics: PortfolioMetrics;
  calculatedAt: string;
}

interface PortfolioHolding {
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  amount: number;
  valueUsd: number;
  allocation: number; // Percentage of portfolio
  priceUsd: number;
  priceChange24h?: number; // Percentage
}

interface PortfolioTimeseriesData {
  timestamp: string;
  value: number;
  deposits?: number;
  withdrawals?: number;
}

interface PortfolioMetrics {
  sharpeRatio?: number;
  volatility?: number;
  maxDrawdown?: number;
  beta?: number;
  diversificationScore?: number; // 0-100 scale
  topHoldingAllocation?: number; // Percentage in largest holding
}

@Injectable()
export class PortfolioAnalyticsService {
  private readonly logger = new Logger(PortfolioAnalyticsService.name);

  constructor(
    @InjectRepository(PortfolioSnapshot)
    private readonly portfolioSnapshotRepository: Repository<PortfolioSnapshot>,
    @InjectRepository(TokenPerformance)
    private readonly tokenPerformanceRepository: Repository<TokenPerformance>,
    private readonly cacheService: AnalyticsCacheService,
  ) {}
  
  /**
   * Parse granularity string to appropriate timeframe value
   * @param granularity Granularity string (e.g., '1h', '1d', '1w')
   * @returns Standardized timeframe value
   */
  private parseGranularity(granularity?: string): string {
    if (!granularity) return 'DAY'; // Default to daily
    
    switch (granularity.toLowerCase()) {
      case '1h':
      case 'hour':
        return 'HOUR';
      case '1d':
      case 'day':
        return 'DAY';
      case '1w':
      case 'week':
        return 'WEEK';
      case '1m':
      case 'month':
        return 'MONTH';
      default:
        return 'DAY';
    }
  }
  
  /**
   * Calculate portfolio diversification score based on holdings
   * @param holdings Array of portfolio holdings
   * @returns Score from 0-100 representing diversification level
   */
  private calculateDiversificationScore(holdings: PortfolioHolding[]): number {
    if (!holdings || holdings.length === 0) {
      return 0;
    }
    
    // Sort holdings by allocation (descending)
    const sortedHoldings = [...holdings].sort((a, b) => b.allocation - a.allocation);
    
    // Calculate Herfindahl-Hirschman Index (HHI) - measure of concentration
    const hhi = sortedHoldings.reduce((sum, holding) => {
      return sum + Math.pow(holding.allocation / 100, 2);
    }, 0);
    
    // Convert HHI to diversification score (0-100)
    // HHI of 1 means complete concentration (single asset)
    // HHI approaching 0 means perfect diversification
    return Math.round((1 - hhi) * 100);
  }
  
  /**
   * Calculate maximum drawdown from a series of portfolio values
   * @param values Array of portfolio values over time
   * @returns Maximum drawdown as a decimal (e.g., 0.25 for 25% drawdown)
   */
  private calculateMaxDrawdown(values: number[]): number {
    if (!values || values.length < 2) {
      return 0;
    }
    
    let maxDrawdown = 0;
    let peak = values[0];
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > peak) {
        peak = values[i];
      } else {
        const drawdown = (peak - values[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown;
  }
  
  /**
   * Calculate standard deviation (volatility) of returns
   * @param values Array of portfolio values over time
   * @returns Annualized standard deviation
   */
  private calculateVolatility(values: number[]): number {
    if (!values || values.length < 2) {
      return 0;
    }
    
    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i-1] !== 0) {
        returns.push((values[i] - values[i-1]) / values[i-1]);
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
    return stdDev * Math.sqrt(365);
  }
  
  /**
   * Calculate Sharpe ratio (risk-adjusted return)
   * @param values Array of portfolio values over time
   * @param riskFreeRate Annual risk-free rate (decimal)
   * @returns Sharpe ratio
   */
  private calculateSharpeRatio(values: number[], riskFreeRate: number = 0.02): number {
    if (!values || values.length < 30) { // Need reasonable sample size
      return 0;
    }
    
    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i-1] !== 0) {
        returns.push((values[i] - values[i-1]) / values[i-1]);
      } else {
        returns.push(0);
      }
    }
    
    // Calculate mean return and annualize
    const meanDailyReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const annualizedReturn = meanDailyReturn * 365;
    
    // Calculate volatility (already annualized)
    const volatility = this.calculateVolatility(values);
    
    if (volatility === 0) return 0;
    
    // Calculate Sharpe ratio
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  /**
   * Get portfolio analytics and performance tracking for a user.
   * @param userId The ID of the user.
   * @param from Start date (ISO 8601).
   * @param to End date (ISO 8601).
   * @param granularity Time granularity (1h, 1d, 1w, 1m).
   * @returns Portfolio performance data.
   */
  async getPortfolioPerformance(
    userId: string,
    from?: string,
    to?: string,
    granularity?: string,
  ): Promise<PortfolioPerformanceResult> {
    const cacheKey = `portfolio-performance:${userId}:${from}:${to}:${granularity}`;
    // User-specific data might have shorter cache times or different strategies
    const cachedData = await this.cacheService.get<PortfolioPerformanceResult>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    // Parse date range
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format. Please use ISO 8601 format.');
    }

    // Parse granularity
    const timeframe = this.parseGranularity(granularity);

    this.logger.log(
      `Fetching portfolio performance for user: ${userId}, from: ${fromDate.toISOString()}, to: ${toDate.toISOString()}, timeframe: ${timeframe}`,
    );

    try {
      // Fetch portfolio snapshots for the time period
      const snapshots = await this.portfolioSnapshotRepository.find({
        where: {
          userId,
          timestamp: Between(fromDate, toDate),
          timeframe,
        },
        order: { timestamp: 'ASC' },
      });

      if (snapshots.length === 0) {
        throw new NotFoundException(`No portfolio data found for user ${userId} in the specified time range`);
      }

      // Get the most recent snapshot for current holdings
      const latestSnapshot = snapshots[snapshots.length - 1];
      const previousSnapshot = snapshots.length > 1 ? snapshots[0] : null;
      
      // Parse holdings from the latest snapshot
      const holdings: PortfolioHolding[] = [];
      const latestHoldings = JSON.parse(JSON.stringify(latestSnapshot.holdings));
      let totalValue = 0;
      
      // Calculate current value and allocations
      for (const holding of latestHoldings) {
        // Fetch current token price
        const tokenPerf = await this.tokenPerformanceRepository.findOne({
          where: { tokenAddress: holding.tokenAddress },
          order: { timestamp: 'DESC' },
        });
        
        if (tokenPerf) {
          const valueUsd = holding.amount * tokenPerf.price;
          totalValue += valueUsd;
          
          holdings.push({
            tokenAddress: holding.tokenAddress,
            // Use address as fallback since TokenPerformance doesn't have symbol/name
            tokenSymbol: holding.tokenAddress.substring(0, 8) + '...',
            amount: holding.amount,
            valueUsd,
            allocation: 0, // Will calculate after we know total value
            priceUsd: tokenPerf.price,
            priceChange24h: tokenPerf.priceChangePercent24h,
          });
        }
      }
      
      // Calculate allocations
      for (const holding of holdings) {
        holding.allocation = (holding.valueUsd / totalValue) * 100;
      }
      
      // Calculate total value change
      const previousValue = previousSnapshot ? previousSnapshot.totalValue : 0;
      const valueChange = totalValue - previousValue;
      const percentageChange = previousValue !== 0 ? (valueChange / previousValue) * 100 : 0;
      
      // Extract performance timeseries data
      const performanceData = snapshots.map(snapshot => ({
        timestamp: snapshot.timestamp.toISOString(),
        value: snapshot.totalValue,
        // PortfolioSnapshot doesn't have deposits/withdrawals fields
        // We'll use 0 as default or implement additional logic if needed
        deposits: 0,
        withdrawals: 0,
      }));
      
      // Calculate portfolio metrics
      const valueTimeseries = performanceData.map(pd => pd.value);
      const volatility = this.calculateVolatility(valueTimeseries);
      const maxDrawdown = this.calculateMaxDrawdown(valueTimeseries);
      const sharpeRatio = this.calculateSharpeRatio(valueTimeseries);
      const diversificationScore = this.calculateDiversificationScore(holdings);
      
      // Find top holding allocation
      const sortedHoldings = [...holdings].sort((a, b) => b.allocation - a.allocation);
      const topHoldingAllocation = sortedHoldings.length > 0 ? sortedHoldings[0].allocation : 0;
      
      // Construct the result
      const result: PortfolioPerformanceResult = {
        userId,
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        granularity: timeframe,
        totalValue,
        totalValueChange: {
          amount: valueChange,
          percentage: percentageChange,
        },
        holdings,
        performanceData,
        metrics: {
          sharpeRatio,
          volatility,
          maxDrawdown,
          diversificationScore,
          topHoldingAllocation,
        },
        calculatedAt: new Date().toISOString(),
      };

      // Cache the result for 5 minutes (user-specific data should have shorter TTL)
      await this.cacheService.set(cacheKey, result, 300);
      return result;
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      if (error instanceof Error) {
        this.logger.error(`Error calculating portfolio performance: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error calculating portfolio performance: ${String(error)}`);
      }
      
      throw new Error(`Failed to calculate portfolio performance: ${String(error)}`);
    }
  }
  
  /**
   * Calculate profit and loss (P&L) for a user's portfolio
   * @param userId The ID of the user
   * @param period Time period for analysis (e.g., '7d', '30d', 'all')
   * @returns Detailed P&L analysis
   */
  async getPortfolioProfitLoss(userId: string, period: string = '30d'): Promise<any> {
    const cacheKey = `portfolio-pnl:${userId}:${period}`;
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    
    try {
      // Calculate date range based on period
      const toDate = new Date();
      let fromDate: Date;
      
      if (period === 'all') {
        // Get the earliest snapshot
        const earliest = await this.portfolioSnapshotRepository.findOne({
          where: { userId },
          order: { timestamp: 'ASC' },
        });
        fromDate = earliest ? earliest.timestamp : new Date(toDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      } else {
        // Parse period format (e.g., '30d')
        const days = parseInt(period.replace(/[^0-9]/g, ''));
        fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      }
      
      // Fetch portfolio snapshots
      const snapshots = await this.portfolioSnapshotRepository.find({
        where: {
          userId,
          timestamp: Between(fromDate, toDate),
        },
        order: { timestamp: 'ASC' },
      });
      
      if (snapshots.length === 0) {
        throw new NotFoundException(`No portfolio data found for user ${userId}`);
      }
      
      // Calculate realized and unrealized P&L
      const startValue = snapshots[0].totalValue;
      const endValue = snapshots[snapshots.length - 1].totalValue;
      
      // Since PortfolioSnapshot doesn't have deposits/withdrawals fields
      // We'll use unrealizedPnl field directly if available, or calculate a simple difference
      const latestSnapshot = snapshots[snapshots.length - 1];
      const unrealizedPnL = latestSnapshot.unrealizedPnl !== null ? 
        latestSnapshot.unrealizedPnl : 
        endValue - startValue;
      
      // Since PortfolioSnapshot doesn't have trades field
      // We'll use realizedPnl field directly if available, or default to 0
      const realizedPnL = latestSnapshot.realizedPnl !== null ? 
        latestSnapshot.realizedPnl : 
        0;
      
      // Calculate percentage returns
      const totalReturn = ((endValue - startValue) / startValue) * 100;
      const annualizedReturn = totalReturn * (365 / ((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)));
      
      const result = {
        userId,
        period,
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        startValue,
        endValue,
        netValue: endValue - startValue,
        netValuePercentage: totalReturn,
        annualizedReturn,
        // Since we don't have deposits/withdrawals fields, providing placeholder data
        deposits: {
          total: 0,
          count: 0,
        },
        withdrawals: {
          total: 0,
          count: 0,
        },
        pnl: {
          realized: realizedPnL,
          unrealized: unrealizedPnL,
          total: realizedPnL + unrealizedPnL,
        },
        calculatedAt: new Date().toISOString(),
      };
      
      // Cache the result
      await this.cacheService.set(cacheKey, result, 300); // Cache for 5 minutes
      return result;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      if (error instanceof Error) {
        this.logger.error(`Error calculating portfolio P&L: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Error calculating portfolio P&L: ${String(error)}`);
      }
      
      throw new Error(`Failed to calculate portfolio P&L: ${String(error)}`);
    }
  }
}
