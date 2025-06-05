import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * TokenPerformance entity stores historical token price and volume data
 * with time-series indexing for efficient querying
 */
@Entity('token_performance')
@Index(['tokenAddress', 'timestamp']) // Composite index for time-series queries
export class TokenPerformance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  tokenAddress!: string;

  @Column('decimal', { precision: 24, scale: 12 })
  price!: number;

  @Column('decimal', { precision: 24, scale: 12 })
  priceChangePercent24h!: number;

  @Column('decimal', { precision: 36, scale: 6 })
  volume24h!: number;

  @Column('decimal', { precision: 36, scale: 6 })
  volumeChangePercent24h!: number;

  @Column('decimal', { precision: 36, scale: 6 })
  liquidity!: number;

  @Column('decimal', { precision: 24, scale: 12 })
  marketCap!: number;

  @Column('decimal', { precision: 24, scale: 12, nullable: true })
  high24h!: number;

  @Column('decimal', { precision: 24, scale: 12, nullable: true })
  low24h!: number;

  @Column('decimal', { precision: 24, scale: 12, nullable: true })
  ath!: number;

  @Column('timestamp', { nullable: true })
  athDate!: Date;

  @Column('decimal', { precision: 24, scale: 12, nullable: true })
  atl!: number;

  @Column('timestamp', { nullable: true })
  atlDate!: Date;

  @Column('int', { default: 0 })
  txCount24h!: number;

  @Column('int', { default: 0 })
  holderCount!: number;

  @Column('varchar', { length: 10 })
  timeframe!: string; // '1h', '1d', '1w', '1m'

  @CreateDateColumn()
  @Index()
  timestamp!: Date;

  @Column('timestamp', { nullable: true })
  dataCollectedAt!: Date;
}
