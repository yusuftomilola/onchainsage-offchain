import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TradingCall {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  asset!: string;

  @Column()
  callType!: 'buy' | 'sell';

  @Column('decimal')
  priceAtCall!: number;

  @Column()
  timestamp!: Date;

  @Column({ default: 'open' })
  status!: 'open' | 'closed';

  @Column({ nullable: true })
  outcome!: 'win' | 'loss' | 'neutral';
}
