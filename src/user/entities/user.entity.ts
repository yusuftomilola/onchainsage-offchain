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
@Index(['walletAddress'], { unique: true, where: 'wallet_address IS NOT NULL' })
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
@Index(['username'], { unique: true, where: 'username IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  // Web3 Authentication
  @Column({ unique: true, name: 'wallet_address', nullable: true })
  walletAddress?: string;

  // Traditional Authentication  
  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  password?: string;

  // Profile Information
  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  bio?: string;

  // Reputation & Subscription
  @Column({ type: 'integer', default: 0 })
  reputation?: number;

  @Column({ type: 'text', default: 'user' })
  role?: string;

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

  // Community module relations (using string references to avoid circular imports)
  @OneToMany('Post', 'author')
  posts?: any[];

  @OneToMany('Comment', 'author')
  comments?: any[];

  @OneToMany(() => PerformanceTracking, (performance) => performance.user)
  performanceTracking?: PerformanceTracking[];

  @OneToMany(() => Vote, (vote) => vote.user)
  votes?: Vote[];
}
