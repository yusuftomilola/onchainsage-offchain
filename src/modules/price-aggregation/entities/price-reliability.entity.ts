import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('price_reliability')
export class PriceReliability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  dexName: string;

  @Column()
  @Index()
  chainId: string;

  @Column({ default: 100 })
  reliabilityScore: number;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  averageDelaySeconds: number;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  priceDeviationPercent: number;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ default: 0 })
  successCount: number;

  @Column('jsonb', { nullable: true })
  metricHistory: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
