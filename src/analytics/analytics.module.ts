import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './provider/analytics.service';
import { TokenPerformanceService } from './provider/token-performance.service';
import { MarketSentimentService } from './provider/market-sentiment.service';
import { CorrelationService } from './provider/correlation.service';
import { VolatilityService } from './provider/volatility.service';
import { PortfolioAnalyticsService } from './provider/portfolio-analytics.service';
import { BenchmarkService } from './provider/benchmark.service';
import { AnalyticsCacheService } from './provider/analytics-cache.service';

// Entities
import { TokenPerformance } from './entities/token-performance.entity';
import { MarketSentiment } from './entities/market-sentiment.entity';
import { VolatilityMetric } from './entities/volatility-metric.entity';
import { PortfolioSnapshot } from './entities/portfolio-snapshot.entity';
import { BenchmarkComparison } from './entities/benchmark-comparison.entity';
import { AnalyticsAggregation } from './entities/analytics-aggregation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokenPerformance,
      MarketSentiment,
      VolatilityMetric,
      PortfolioSnapshot,
      BenchmarkComparison,
      AnalyticsAggregation
    ]),
    CacheModule.register(), // Default in-memory cache. Configure for Redis if needed.
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    TokenPerformanceService,
    MarketSentimentService,
    CorrelationService,
    VolatilityService,
    PortfolioAnalyticsService,
    BenchmarkService,
    AnalyticsCacheService
  ],
  exports: [
    AnalyticsService,
    TokenPerformanceService,
    MarketSentimentService,
    CorrelationService,
    VolatilityService,
    PortfolioAnalyticsService,
    BenchmarkService,
    AnalyticsCacheService // Export if other modules need direct cache access via this module's service
  ]
})
export class AnalyticsModule {}
