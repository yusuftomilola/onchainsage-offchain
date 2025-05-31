import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Reputation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column('decimal')
  score!: number;

  @Column()
  lastUpdated!: Date;
}
