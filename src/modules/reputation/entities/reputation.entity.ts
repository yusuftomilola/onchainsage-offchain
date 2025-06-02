import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Reputation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('integer')
  userId!: number;

  @Column('decimal')
  score!: number;

  @Column({ type: 'timestamp with time zone' })
  lastUpdated!: Date;
}
