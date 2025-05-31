import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ReputationHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column('decimal')
  score!: number;

  @Column()
  timestamp!: Date;
}
