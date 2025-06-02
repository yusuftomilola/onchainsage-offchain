import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Unique } from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';
import { Comment } from './comment.entity';

@Entity('votes')
@Unique(['user', 'post'])
@Unique(['user', 'comment'])
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ type: 'enum', enum: ['up', 'down'] })
  type: 'up' | 'down' | undefined;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date | undefined;

  @ManyToOne(() => User, user => user.votes)
  user: User | undefined;

  @ManyToOne(() => Post, post => post.votes, { nullable: true })
  post: Post | undefined;

  @ManyToOne(() => Comment, comment => comment.votes, { nullable: true })
  comment: Comment | undefined;
}
