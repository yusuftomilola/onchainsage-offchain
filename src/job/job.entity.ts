import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class JobEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  status!: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

  @Column({ nullable: true })
  startedAt!: Date;

  @Column({ nullable: true })
  completedAt!: Date;

  @Column({ default: 0 })
  attempts!: number;
}