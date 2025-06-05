import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * MarketSentiment entity stores sentiment analysis data from various sources
 * with time-series indexing for efficient querying
 */
@Entity('market_sentiment')
@Index(['tokenAddress', 'source', 'timestamp']) // Composite index for time-series queries
export class MarketSentiment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  tokenAddress!: string;

  @Column()
  @Index()
  source!: string; // 'twitter', 'telegram', 'discord', 'reddit', etc.

  @Column('decimal', { precision: 5, scale: 2 })
  sentimentScore!: number; // Range from -1.0 (very negative) to 1.0 (very positive)

  @Column('int', { default: 0 })
  mentionCount!: number;

  @Column('int', { default: 0 })
  engagementCount!: number;

  @Column('jsonb', { nullable: true })
  keyPhrases!: string[]; // Most common phrases associated with token

  @Column('jsonb', { nullable: true })
  topInfluencers!: Record<string, number>; // Influencer IDs and their engagement metrics

  @Column('varchar', { length: 10 })
  timeframe!: string; // '1h', '1d', '1w', '1m'

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, any>; // Additional metadata specific to the source

  @CreateDateColumn()
  @Index()
  timestamp!: Date;

  @Column('timestamp', { nullable: true })
  dataCollectedAt!: Date;
}
