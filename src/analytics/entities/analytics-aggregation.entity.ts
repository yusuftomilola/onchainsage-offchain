import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, UpdateDateColumn } from 'typeorm';

/**
 * AnalyticsAggregation entity stores pre-aggregated analytical data for faster querying.
 * This can include hourly, daily, weekly, or monthly roll-ups of various metrics.
 */
@Entity('analytics_aggregations')
@Index(['aggregationType', 'metricName', 'tokenAddress', 'timeframe', 'aggregationTimestamp'])
export class AnalyticsAggregation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  aggregationType!: string; // e.g., 'TOKEN_PERFORMANCE', 'MARKET_SENTIMENT', 'VOLATILITY'

  @Column()
  @Index()
  metricName!: string; // e.g., 'avg_price', 'total_volume', 'avg_sentiment_score'

  @Column({ nullable: true })
  @Index()
  tokenAddress?: string; // Nullable if the aggregation is market-wide or not token-specific

  @Column('varchar', { length: 10 })
  @Index()
  timeframe!: string; // '1h', '1d', '1w', '1m' - The granularity of the aggregation

  @Column('decimal', { precision: 36, scale: 12 })
  aggregatedValue!: number;

  @Column('jsonb', { nullable: true })
  supportingData?: Record<string, any>; // e.g., min, max, count, sum for the period

  @Column('timestamp')
  @Index()
  aggregationTimestamp!: Date; // The specific point in time this aggregation represents (e.g., start of the hour/day)

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('timestamp', { nullable: true })
  lastCalculatedAt!: Date; // When this specific aggregation was last computed

  @Column('int', { default: 0 })
  sourceDataPoints!: number; // Number of raw data points used for this aggregation
}
