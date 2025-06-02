import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TradingCall {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('integer')
  userId!: number;

  @Column('text')
  asset!: string;

  @Column({ type: 'enum', enum: ['buy', 'sell'] })
  callType!: 'buy' | 'sell';

  @Column('decimal')
  priceAtCall!: number;

  @Column({ type: 'timestamp with time zone' })
  timestamp!: Date;

  @Column({ type: 'enum', enum: ['open', 'closed'], default: 'open' })
  status!: 'open' | 'closed';

  @Column({ type: 'enum', enum: ['win', 'loss', 'neutral'], nullable: true })
  outcome!: 'win' | 'loss' | 'neutral';
}
