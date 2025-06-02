import { CommunityPost } from '@/community-post/entities/community-post.entity';
import { User } from '@/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

export enum VoteType {
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
}

@Entity('votes')
@Unique(['user', 'post'])
@Index(['post', 'type'])
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({
    type: 'enum',
    enum: VoteType,
  })
  type?: VoteType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.votes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id' })
  userId?: string;

  @ManyToOne(() => CommunityPost, (post) => post.votes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post?: CommunityPost;

  @Column({ name: 'post_id' })
  postId?: string;
}
