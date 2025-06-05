import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('price_data')
export class PriceData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tokenAddress: string;

  @Column()
  @Index()
  chainId: string;

  @Column()
  dexName: string;

  @Column('decimal', { precision: 30, scale: 18 })
  priceUsd: number;

  @Column('decimal', { precision: 30, scale: 18, nullable: true })
  volume24h: number;

  @Column('decimal', { precision: 30, scale: 18, nullable: true })
  liquidity: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  slippageFor1000Usd: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  slippageFor10000Usd: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  slippageFor100000Usd: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  feePercent: number;

  @Column('jsonb', { nullable: true })
  rawData: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 100 })
  reliabilityScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
