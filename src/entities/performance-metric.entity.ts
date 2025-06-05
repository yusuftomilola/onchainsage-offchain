import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class PerformanceMetric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  accuracy: number = 0;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalProfit: number = 0;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalLoss: number = 0;

  @Column('int', { default: 0 })
  totalTrades: number = 0;

  @Column('jsonb', { default: {} })
  metrics: {
    winRate: number;
    averageProfit: number;
    averageLoss: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
  } = {
    winRate: 0,
    averageProfit: 0,
    averageLoss: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
  };

  @CreateDateColumn()
  timestamp!: Date;
} 