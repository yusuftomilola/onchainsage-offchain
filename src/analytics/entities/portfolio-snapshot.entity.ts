import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

/**
 * PortfolioSnapshot entity stores historical portfolio performance data
 * with time-series indexing for efficient querying
 */
@Entity('portfolio_snapshots')
@Index(['userId', 'timestamp']) // Composite index for time-series queries
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  userId!: string;

  @Column('decimal', { precision: 36, scale: 6 })
  totalValue!: number; // Total portfolio value in USD

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  dailyChangePercent!: number; // Daily change percentage

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  weeklyChangePercent!: number; // Weekly change percentage

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  monthlyChangePercent!: number; // Monthly change percentage

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  allTimeChangePercent!: number; // All-time change percentage

  @Column('decimal', { precision: 36, scale: 6, nullable: true })
  realizedPnl!: number; // Realized profit/loss in USD

  @Column('decimal', { precision: 36, scale: 6, nullable: true })
  unrealizedPnl!: number; // Unrealized profit/loss in USD

  @Column('jsonb')
  holdings!: {
    tokenAddress: string;
    amount: number;
    valueUsd: number;
    allocation: number; // Percentage of portfolio
    costBasis: number; // Average cost basis
    pnl: number; // Profit/loss for this token
  }[];

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  sharpeRatio!: number; // Risk-adjusted return

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  maxDrawdown!: number; // Maximum drawdown percentage

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  volatility!: number; // Portfolio volatility

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  beta!: number; // Portfolio beta relative to market

  @Column('varchar', { length: 10 })
  timeframe!: string; // '1h', '1d', '1w', '1m'

  @CreateDateColumn()
  @Index()
  timestamp!: Date;

  @Column('timestamp', { nullable: true })
  calculatedAt!: Date;
}
