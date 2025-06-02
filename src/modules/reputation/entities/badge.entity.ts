import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Badge {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('integer')
  userId!: number;

  @Column('text')
  badgeName!: string;

  @Column({ type: 'timestamp with time zone' })
  earnedAt!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  revokedAt?: Date | null;
}
