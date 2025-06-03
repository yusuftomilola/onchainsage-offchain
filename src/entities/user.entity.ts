import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TradingSignal } from './trading-signal.entity';
import { CommunityPost } from './community-post.entity';
import { PerformanceMetric } from './performance-metric.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  walletAddress!: string;

  @Column({ default: false })
  isSubscribed: boolean = false;

  @Column('jsonb', { default: {} })
  preferences: {
    notificationSettings: {
      email: boolean;
      push: boolean;
    };
    tradingPreferences: {
      riskLevel: 'low' | 'medium' | 'high';
      preferredTokens: string[];
    };
  } = {
    notificationSettings: {
      email: false,
      push: false,
    },
    tradingPreferences: {
      riskLevel: 'medium',
      preferredTokens: [],
    },
  };

  @OneToMany(() => TradingSignal, (signal) => signal.user)
  tradingSignals: TradingSignal[] = [];

  @OneToMany(() => CommunityPost, (post) => post.author)
  posts: CommunityPost[] = [];

  @OneToMany(() => PerformanceMetric, (metric) => metric.user)
  performanceMetrics: PerformanceMetric[] = [];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 