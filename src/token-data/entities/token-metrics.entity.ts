
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class TokenMetrics {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  tokenAddress!: string;

  @Column('decimal')
  price!: number;

  @Column('decimal')
  volume24h!: number;

  @Column('decimal')
  liquidity!: number;

  @CreateDateColumn()
  timestamp!: Date;
}

