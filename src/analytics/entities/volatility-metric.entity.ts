import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * VolatilityMetric entity stores volatility and risk metrics for tokens
 * with time-series indexing for efficient querying
 */
@Entity('volatility_metrics')
@Index(['tokenAddress', 'timeframe', 'timestamp']) // Composite index for time-series queries
export class VolatilityMetric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  tokenAddress!: string;

  @Column('decimal', { precision: 10, scale: 6 })
  standardDeviation!: number; // Standard deviation of returns

  @Column('decimal', { precision: 10, scale: 6 })
  averageTrueRange!: number; // ATR - volatility indicator

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  beta!: number; // Beta relative to a benchmark (e.g., ETH or BTC)

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  sharpeRatio!: number; // Risk-adjusted return

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  valueAtRisk!: number; // VaR at 95% confidence

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  maxDrawdown!: number; // Maximum drawdown percentage

  @Column('int', { nullable: true })
  volatilityRank!: number; // Rank among comparable tokens (1 = least volatile)

  @Column('varchar', { length: 10 })
  timeframe!: string; // '1h', '1d', '1w', '1m'

  @Column('int', { default: 0 })
  sampleSize!: number; // Number of data points used in calculation

  @Column('jsonb', { nullable: true })
  additionalMetrics!: Record<string, number>; // Other volatility metrics

  @CreateDateColumn()
  @Index()
  timestamp!: Date;

  @Column('timestamp', { nullable: true })
  calculatedAt!: Date;
}
