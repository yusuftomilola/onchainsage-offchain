import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './provider/analytics.service';
import { TokenPerformanceService } from './provider/token-performance.service';
import { MarketSentimentService } from './provider/market-sentiment.service';
import { CorrelationService, CorrelationResult } from './provider/correlation.service';
import { VolatilityService } from './provider/volatility.service';
import { PortfolioAnalyticsService } from './provider/portfolio-analytics.service';
import type { PortfolioPerformanceResult } from './provider';
import { BenchmarkService } from './provider/benchmark.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly tokenPerformanceService: TokenPerformanceService,
    private readonly marketSentimentService: MarketSentimentService,
    private readonly correlationService: CorrelationService,
    private readonly volatilityService: VolatilityService,
    private readonly portfolioAnalyticsService: PortfolioAnalyticsService,
    private readonly benchmarkService: BenchmarkService,
  ) {}

  @Get('token/:tokenAddress/performance')
  @ApiOperation({ summary: 'Get token performance analytics' })
  @ApiParam({ name: 'tokenAddress', description: 'The address of the token' })
  @ApiQuery({ name: 'from', description: 'Start date (ISO 8601)', required: false })
  @ApiQuery({ name: 'to', description: 'End date (ISO 8601)', required: false })
  @ApiQuery({ name: 'granularity', description: 'Time granularity (1h, 1d, 1w, 1m)', enum: ['1h', '1d', '1w', '1m'], required: false, example: '1d' })

  async getTokenPerformance(
    @Param('tokenAddress') tokenAddress: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.tokenPerformanceService.getPerformance(tokenAddress, from, to, granularity);
  }

  @Get('market/sentiment')
  @ApiOperation({ summary: 'Get market sentiment analysis' })
  @ApiQuery({ name: 'tokenAddress', description: 'Optional: Filter by token address', required: false })
  @ApiQuery({ name: 'source', description: 'Optional: Filter by sentiment source (e.g., twitter, reddit)', required: false })
  @ApiQuery({ name: 'from', description: 'Start date (ISO 8601)', required: false })
  @ApiQuery({ name: 'to', description: 'End date (ISO 8601)', required: false })
  @ApiQuery({ name: 'granularity', description: 'Time granularity (1h, 1d, 1w, 1m)', enum: ['1h', '1d', '1w', '1m'], required: false, example: '1d' })

  async getMarketSentiment(
    @Query('tokenAddress') tokenAddress?: string,
    @Query('source') source?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.marketSentimentService.getSentiment(tokenAddress, source, from, to, granularity);
  }

  @Get('correlation/sentiment-price')
  @ApiOperation({ summary: 'Get correlation analysis between social sentiment and price movements' })
  @ApiQuery({ name: 'tokenAddress', description: 'The address of the token' })
  @ApiQuery({ name: 'sentimentSource', description: 'Sentiment source (e.g., twitter)', required: true })
  @ApiQuery({ name: 'period', description: 'Correlation period (e.g., 7d, 30d)', required: true, example: '30d' })
    async getSentimentPriceCorrelation(
    @Query('tokenAddress') tokenAddress: string,
    @Query('sentimentSource') sentimentSource: string,
    @Query('period') period: string,
  ): Promise<CorrelationResult> {
    return this.correlationService.getSentimentPriceCorrelation(tokenAddress, sentimentSource, period);
  }

  @Get('token/:tokenAddress/volatility')
  @ApiOperation({ summary: 'Get volatility calculations and risk metrics for a token' })
  @ApiParam({ name: 'tokenAddress', description: 'The address of the token' })
  @ApiQuery({ name: 'period', description: 'Calculation period (e.g., 30d, 90d)', required: true, example: '30d' })

  async getVolatilityMetrics(
    @Param('tokenAddress') tokenAddress: string,
    @Query('period') period: string,
  ) {
    return this.volatilityService.getVolatility(tokenAddress, period);
  }

  @Get('portfolio/:userId/performance')
  @ApiOperation({ summary: 'Get portfolio analytics and performance tracking for a user' })
  @ApiParam({ name: 'userId', description: 'The ID of the user' })
  @ApiQuery({ name: 'from', description: 'Start date (ISO 8601)', required: false })
  @ApiQuery({ name: 'to', description: 'End date (ISO 8601)', required: false })
  @ApiQuery({ name: 'granularity', description: 'Time granularity (1h, 1d, 1w, 1m)', enum: ['1h', '1d', '1w', '1m'], required: false, example: '1d' })

  async getPortfolioAnalytics(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
  ): Promise<PortfolioPerformanceResult> {
    return this.portfolioAnalyticsService.getPortfolioPerformance(userId, from, to, granularity);
  }

  @Get('market/comparison')
  @ApiOperation({ summary: 'Get market comparison and benchmark analytics' })
  @ApiQuery({ name: 'tokenAddress', description: 'Primary token address for comparison' })
  @ApiQuery({ name: 'benchmarkToken', description: 'Benchmark token address or symbol (e.g., BTC, ETH)', required: false })
  @ApiQuery({ name: 'period', description: 'Comparison period (e.g., 7d, 30d, 90d)', required: true, example: '30d' })
    async getMarketComparison(
    @Query('tokenAddress') tokenAddress: string,
    @Query('benchmarkToken') benchmarkToken?: string,
    @Query('period') period?: string,
  ) {
    return this.benchmarkService.getComparison(tokenAddress, benchmarkToken, period);
  }

  @Get('reports/export')
  @ApiOperation({ summary: 'Export analytics reports' })
  @ApiQuery({ name: 'reportType', description: 'Type of report (e.g., token_performance, portfolio_summary)', required: true })
  @ApiQuery({ name: 'format', description: 'Export format (json, csv)', enum: ['json', 'csv'], required: true, example: 'csv' })
  @ApiQuery({ name: 'tokenAddress', description: 'Token address (if applicable)', required: false })
  @ApiQuery({ name: 'userId', description: 'User ID (if applicable for portfolio reports)', required: false })
  @ApiQuery({ name: 'from', description: 'Start date (ISO 8601)', required: false })
  @ApiQuery({ name: 'to', description: 'End date (ISO 8601)', required: false })
  // This endpoint might not be suitable for general HTTP caching if reports are highly dynamic or large
  async exportReport(
    @Query('reportType') reportType: string,
    @Query('format') format: 'json' | 'csv',
    // ... other relevant query params
  ) {
    // Implementation will involve fetching data and formatting it
    // For CSV, you might use a library like 'papaparse' or stream the response
    return this.analyticsService.exportReport(reportType, format, {}); // Pass relevant params
  }
}
