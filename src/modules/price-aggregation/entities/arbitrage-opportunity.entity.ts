import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('arbitrage_opportunities')
export class ArbitrageOpportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tokenAddress: string;

  @Column()
  sourceChainId: string;

  @Column()
  sourceDexName: string;

  @Column()
  targetChainId: string;

  @Column()
  targetDexName: string;

  @Column('decimal', { precision: 30, scale: 18 })
  sourcePriceUsd: number;

  @Column('decimal', { precision: 30, scale: 18 })
  targetPriceUsd: number;

  @Column('decimal', { precision: 10, scale: 4 })
  profitPercent: number;

  @Column('decimal', { precision: 10, scale: 4 })
  estimatedFeePercent: number;

  @Column('decimal', { precision: 10, scale: 4 })
  netProfitPercent: number;

  @Column('jsonb', { nullable: true })
  routeDetails: Record<string, any>;

  @Column({ default: false })
  isCrossChain: boolean;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  detectedAt: Date;
}
