import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Badge {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  badgeName!: string;

  @Column()
  earnedAt!: Date;

  // @Column({ nullable: true })
  // revokedAt?: Date | null;
  @Column({ type: 'timestamp', nullable: true })
revokedAt?: Date; // ✅ Correct

}
