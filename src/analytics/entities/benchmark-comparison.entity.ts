import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * BenchmarkComparison entity stores data comparing a token against a benchmark
 * or another set of tokens, with time-series indexing.
 */
@Entity('benchmark_comparisons')
@Index(['tokenAddress', 'benchmarkToken', 'timeframe', 'timestamp'])
export class BenchmarkComparison {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  tokenAddress!: string; // The primary token being analyzed

  @Column()
  @Index()
  benchmarkToken!: string; // The benchmark token/index (e.g., 'BTC', 'ETH', 'TOP10_INDEX')

  @Column('decimal', { precision: 10, scale: 4 })
  correlationCoefficient!: number; // Pearson correlation with benchmark

  @Column('decimal', { precision: 10, scale: 4 })
  beta!: number; // Beta relative to the benchmark

  @Column('decimal', { precision: 10, scale: 4 })
  alpha!: number; // Alpha relative to the benchmark (excess return)

  @Column('decimal', { precision: 10, scale: 2 })
  tokenReturn!: number; // Return of the primary token for the period

  @Column('decimal', { precision: 10, scale: 2 })
  benchmarkReturn!: number; // Return of the benchmark for the period

  @Column('decimal', { precision: 10, scale: 2 })
  outperformance!: number; // Difference in returns (tokenReturn - benchmarkReturn)

  @Column('varchar', { length: 10 })
  timeframe!: string; // '1h', '1d', '1w', '1m'

  @Column('jsonb', { nullable: true })
  additionalMetrics!: Record<string, number>; // Other comparison metrics

  @CreateDateColumn()
  @Index()
  timestamp!: Date;

  @Column('timestamp', { nullable: true })
  calculatedAt!: Date;
}
