import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../community/entities/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column()
  type: string | undefined; 

  @Column()
  title: string | undefined;

  @Column()
  message: string | undefined;

  @Column({ nullable: true })
  entityId: string | undefined; 

  @Column({ nullable: true })
  entityType: string | undefined; 

  @Column({ default: false })
  isRead: boolean | undefined;

  @CreateDateColumn()
  createdAt: Date | undefined;

  @ManyToOne(() => User)
  recipient: User | undefined;

  @ManyToOne(() => User)
  actor: User | undefined;
}