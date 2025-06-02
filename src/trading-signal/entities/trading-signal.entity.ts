import { User } from '@/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum SignalAction {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold',
}

export enum SignalStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

@Entity('trading_signals')
@Index(['token', 'createdAt'])
@Index(['author', 'createdAt'])
@Index(['status', 'createdAt'])
export class TradingSignal {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column()
  @Index()
  token?: string;

  @Column({ name: 'token_address', nullable: true })
  tokenAddress?: string;

  @Column({
    type: 'enum',
    enum: SignalAction,
  })
  action?: SignalAction;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidence?: number; // 0-100

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  entryPrice?: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  targetPrice?: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  stopLoss?: string;

  @Column({ type: 'text', nullable: true })
  reasoning?: string;

  @Column({
    type: 'enum',
    enum: SignalStatus,
    default: SignalStatus.ACTIVE,
  })
  status?: SignalStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  @Column({ default: 0 })
  views?: number;

  @Column({ default: 0 })
  likes?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    timeframe: string;
    marketCap?: number;
    volume24h?: number;
    technicalIndicators?: any;
  };

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.tradingSignals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @Column({ name: 'author_id' })
  authorId?: string;
}
