import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsAggregation } from '../entities/analytics-aggregation.entity';
// Import other services and entities as needed

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsAggregation)
    private readonly aggregationRepository: Repository<AnalyticsAggregation>,
    private readonly tokenPerformanceService: any,
    private readonly marketSentimentService: any,
    private readonly portfolioAnalyticsService: any,
    private readonly benchmarkService: any,
    private readonly correlationService: any,
  ) {}

  /**
   * Placeholder for exporting analytics reports.
   * This method will fetch data based on reportType and format it.
   * @param reportType - The type of report to generate.
   * @param format - The desired output format ('json' or 'csv').
   * @param params - Additional parameters for filtering the report data.
   * @returns The formatted report data or a stream for CSV.
   */
  async exportReport(reportType: string, format: 'json' | 'csv', params: any): Promise<any> {
    this.logger.log(`Exporting report: ${reportType} in ${format} format with params: ${JSON.stringify(params)}`);

    // Pagination params for large datasets
    const page = parseInt(params.page, 10) || 1;
    const pageSize = parseInt(params.pageSize, 10) || 1000;
    const offset = (page - 1) * pageSize;

    let data: any;
    // Choose service based on reportType
    switch (reportType) {
      case 'token_performance': {
        // Assume tokenPerformanceService is injected and has a method getPerformance
        data = await this.tokenPerformanceService.getPerformance(
          params.tokenAddress,
          params.from,
          params.to,
          params.granularity || '1d'
        );
        // Paginate time-series if needed
        if (data && data.performanceData && Array.isArray(data.performanceData)) {
          data.performanceData = data.performanceData.slice(offset, offset + pageSize);
        }
        break;
      }
      case 'market_sentiment': {
        data = await this.marketSentimentService.getSentiment(
          params.tokenAddress,
          params.source,
          params.from,
          params.to,
          params.granularity || '1d'
        );
        // Paginate sentiment data if needed
        if (data && data.sentimentData && Array.isArray(data.sentimentData)) {
          data.sentimentData = data.sentimentData.slice(offset, offset + pageSize);
        }
        break;
      }
      case 'portfolio_performance': {
        data = await this.portfolioAnalyticsService.getPortfolioPerformance(
          params.userId,
          params.from,
          params.to,
          params.granularity || '1d'
        );
        if (data && data.performanceData && Array.isArray(data.performanceData)) {
          data.performanceData = data.performanceData.slice(offset, offset + pageSize);
        }
        break;
      }
      case 'benchmark_comparison': {
        data = await this.benchmarkService.getComparison(
          params.tokenAddress,
          params.benchmarkToken,
          params.period || '30d'
        );
        break;
      }
      case 'correlation_sentiment_price': {
        data = await this.correlationService.getSentimentPriceCorrelation(
          params.tokenAddress,
          params.sentimentSource,
          params.period || '30d'
        );
        break;
      }
      default: {
        data = { message: 'Unknown report type', reportType, params };
      }
    }

    // Format as CSV if requested
    if (format === 'csv') {
      // Flatten arrays for CSV export, only for main time-series arrays
      let csvRows: string[] = [];
      if (data && Array.isArray(data)) {
        // For array data (not used in above, but fallback)
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]).join(',');
        csvRows = data.map((row: Record<string, any>) => Object.values(row).map(val => JSON.stringify(val)).join(','));
        return `${headers}\n${csvRows.join('\n')}`;
      } else if (data && data.performanceData && Array.isArray(data.performanceData)) {
        const headers = Object.keys(data.performanceData[0] || {}).join(',');
        csvRows = data.performanceData.map((row: Record<string, any>) => Object.values(row).map(val => JSON.stringify(val)).join(','));
        return `${headers}\n${csvRows.join('\n')}`;
      } else if (data && data.sentimentData && Array.isArray(data.sentimentData)) {
        const headers = Object.keys(data.sentimentData[0] || {}).join(',');
        csvRows = data.sentimentData.map((row: Record<string, any>) => Object.values(row).map(val => JSON.stringify(val)).join(','));
        return `${headers}\n${csvRows.join('\n')}`;
      } else if (data && typeof data === 'object') {
        // For single-object reports (benchmark, correlation, etc.)
        const headers = Object.keys(data).join(',');
        const values = Object.values(data).map(val => JSON.stringify(val)).join(',');
        return `${headers}\n${values}`;
      }
      return '';
    }
    // Default: return JSON
    return data;
  }

  // Add other general analytics methods here, such as:
  // - Methods for managing pre-aggregated data (AnalyticsAggregation)
  // - Utility functions shared across different analytics calculations

  /**
   * Example method to save or update an aggregation.
   */
  async saveAggregation(aggregationData: Partial<AnalyticsAggregation>): Promise<AnalyticsAggregation> {
    const existingAggregation = await this.aggregationRepository.findOne({
      where: {
        aggregationType: aggregationData.aggregationType,
        metricName: aggregationData.metricName,
        tokenAddress: aggregationData.tokenAddress,
        timeframe: aggregationData.timeframe,
        aggregationTimestamp: aggregationData.aggregationTimestamp,
      }
    });

    if (existingAggregation) {
      return this.aggregationRepository.save({ ...existingAggregation, ...aggregationData, updatedAt: new Date() });
    }
    return this.aggregationRepository.save(aggregationData);
  }
}
