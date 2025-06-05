import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('trading_signals')
export class TradingSignal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  token!: string;

  @Column()
  action!: 'buy' | 'sell' | 'hold';

  @Column('float', { default: 0 })
  confidence: number = 0;

  @Column('jsonb', { default: {} })
  metadata: {
    price: number;
    volume: number;
    marketCap: number;
    indicators: {
      rsi: number;
      macd: number;
      movingAverages: number[];
    };
  } = {
    price: 0,
    volume: 0,
    marketCap: 0,
    indicators: {
      rsi: 0,
      macd: 0,
      movingAverages: [],
    },
  };

  @ManyToOne(() => User, (user) => user.tradingSignals)
  user!: User;

  @Index()
  @CreateDateColumn()
  timestamp!: Date;

  @Column({ default: false })
  isExecuted: boolean = false;

  @Column('float', { nullable: true })
  executionPrice: number = 0;

  @Column('float', { nullable: true })
  profitLoss: number = 0;
} 