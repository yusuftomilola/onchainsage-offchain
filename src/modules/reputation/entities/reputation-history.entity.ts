import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ReputationHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('integer')
  userId!: number;

  @Column('decimal')
  score!: number;

  @Column({ type: 'timestamp with time zone' })
  timestamp!: Date;
}
