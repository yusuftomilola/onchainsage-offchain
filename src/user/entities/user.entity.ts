import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PerformanceTracking } from '@/performance-tracking/entities/performance-tracking.entity';
import { TradingSignal } from '@/trading-signal/entities/trading-signal.entity';
import { CommunityPost } from '@/community-post/entities/community-post.entity';
import { Vote } from '@/vote/entities/vote.entity';

export enum SubscriptionStatus {
  FREE = 'free',
  PREMIUM = 'premium',
  VIP = 'vip',
}

@Entity('users')
@Index(['walletAddress'], { unique: true })
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ unique: true, name: 'wallet_address' })
  @Index()
  walletAddress?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.FREE,
  })
  subscriptionStatus?: SubscriptionStatus;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    notifications: boolean;
    tradingPairs: string[];
    riskLevel: 'low' | 'medium' | 'high';
    autoTrade: boolean;
  };

  @Column({ default: true })
  isActive?: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login' })
  lastLogin?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  // Relations
  @OneToMany(() => TradingSignal, (signal) => signal.author)
  tradingSignals?: TradingSignal[];

  @OneToMany(() => CommunityPost, (post) => post.author)
  communityPosts?: CommunityPost[];

  @OneToMany(() => PerformanceTracking, (performance) => performance.user)
  performanceTracking?: PerformanceTracking[];

  @OneToMany(() => Vote, (vote) => vote.user)
  votes?: Vote[];
}
