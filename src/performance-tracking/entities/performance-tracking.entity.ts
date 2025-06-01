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

@Entity('performance_tracking')
@Index(['user', 'createdAt'])
@Index(['tradingPair', 'createdAt'])
export class PerformanceTracking {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ name: 'trading_pair' })
  tradingPair?: string;

  @Column({ name: 'signal_type' })
  signalType?: string; // buy, sell, hold

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  entryPrice?: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  exitPrice?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  profitLoss?: number; // percentage

  @Column({ default: false })
  isRealized?: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'closed_at' })
  closedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    confidence: number;
    reasoning?: string;
    duration?: number; // in hours
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.performanceTracking, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id' })
  userId?: string;
}
