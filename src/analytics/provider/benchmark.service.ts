import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BenchmarkComparison } from '../entities/benchmark-comparison.entity';
import { TokenPerformance } from '../entities/token-performance.entity'; // For fetching price data
import { AnalyticsCacheService } from './analytics-cache.service';

@Injectable()
export class BenchmarkService {
  private readonly logger = new Logger(BenchmarkService.name);

  constructor(
    @InjectRepository(BenchmarkComparison)
    private readonly benchmarkComparisonRepository: Repository<BenchmarkComparison>,
    @InjectRepository(TokenPerformance)
    private readonly tokenPerformanceRepository: Repository<TokenPerformance>,
    private readonly cacheService: AnalyticsCacheService,
  ) {}

  /**
   * Get market comparison and benchmark analytics.
   * @param tokenAddress Primary token address for comparison.
   * @param benchmarkToken Benchmark token address or symbol (e.g., BTC, ETH).
   * @param period Comparison period (e.g., 7d, 30d, 90d).
   * @returns Comparison data.
   */
  async getComparison(
    tokenAddress: string,
    benchmarkToken?: string,
    period?: string,
  ): Promise<any> {
    const cacheKey = `benchmark-comparison:${tokenAddress}:${benchmarkToken || 'market'}:${period}`;
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    this.logger.log(
      `Fetching benchmark comparison for token: ${tokenAddress}, benchmark: ${benchmarkToken}, period: ${period}`,
    );
    // 1. Parse period and calculate date range
    const days = this.parsePeriodToDays(period || '30d');
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
    const timeframe = this.getTimeframeForPeriod(days);

    // 2. Fetch historical price data for both tokens
    const [tokenData, benchmarkData] = await Promise.all([
      this.tokenPerformanceRepository.find({
        where: { tokenAddress, timeframe, timestamp: Between(fromDate, toDate) },
        order: { timestamp: 'ASC' },
        select: ['timestamp', 'price']
      }),
      this.tokenPerformanceRepository.find({
        where: { tokenAddress: benchmarkToken || 'ETH_MAINNET', timeframe, timestamp: Between(fromDate, toDate) },
        order: { timestamp: 'ASC' },
        select: ['timestamp', 'price']
      })
    ]);

    if (!tokenData.length || !benchmarkData.length) {
      throw new Error('Insufficient price data for comparison');
    }

    // 3. Align price data by timestamp
    const timestampMap = new Map(tokenData.map(item => [item.timestamp.toISOString(), item.price]));
    const alignedBenchmark = benchmarkData.filter(item => timestampMap.has(item.timestamp.toISOString()));
    const alignedToken = tokenData.filter(item => alignedBenchmark.some(b => b.timestamp.toISOString() === item.timestamp.toISOString()));
    const pricesToken = alignedToken.map(item => item.price);
    const pricesBenchmark = alignedBenchmark.map(item => item.price);

    // 4. Calculate returns
    const calcReturns = (prices: number[]) => prices.slice(1).map((p, i) => (prices[i] !== 0 ? (p - prices[i]) / prices[i] : 0));
    const returnsToken = calcReturns(pricesToken);
    const returnsBenchmark = calcReturns(pricesBenchmark);

    // 5. Calculate metrics
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = (arr: number[]) => {
      const m = mean(arr);
      return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length);
    };
    const covariance = (a: number[], b: number[]) => {
      const ma = mean(a), mb = mean(b);
      return mean(a.map((v, i) => (v - ma) * (b[i] - mb)));
    };
    const correlation = (a: number[], b: number[]) => covariance(a, b) / (std(a) * std(b));
    const beta = (a: number[], b: number[]) => covariance(a, b) / Math.pow(std(b), 2);
    const alpha = (a: number[], b: number[]) => mean(a) - beta(a, b) * mean(b);
    const outperformance = mean(returnsToken) - mean(returnsBenchmark);

    // 6. Compose result
    const result = {
      tokenAddress,
      benchmarkToken: benchmarkToken || 'ETH_MAINNET',
      period: period || '30d',
      tokenReturn: mean(returnsToken) * 100,
      benchmarkReturn: mean(returnsBenchmark) * 100,
      correlationCoefficient: correlation(returnsToken, returnsBenchmark),
      beta: beta(returnsToken, returnsBenchmark),
      alpha: alpha(returnsToken, returnsBenchmark) * 100,
      outperformance: outperformance * 100,
      calculatedAt: new Date().toISOString(),
      dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      dataPoints: returnsToken.length
    };

    await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  // --- Helper methods for period parsing and timeframe selection ---
  private parsePeriodToDays(period: string): number {
    const match = period.match(/^(\d+)([dwmy])$/);
    if (!match) return 30;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return 30;
    }
  }

  private getTimeframeForPeriod(days: number): string {
    if (days <= 7) return 'HOUR';
    if (days <= 90) return 'DAY';
    if (days <= 365) return 'WEEK';
    return 'MONTH';
  }

  // --- Stubs for basket comparison and relative strength indicators ---
  // async compareToBasket(tokenAddress: string, basket: string[], period: string): Promise<any> {
  //   // Implement comparison of token vs. basket of tokens
  // }

  // async getRelativeStrength(tokenAddress: string, benchmarkToken: string, period: string): Promise<any> {
  //   // Implement calculation of RSI or other relative strength indicators
  // }
}

