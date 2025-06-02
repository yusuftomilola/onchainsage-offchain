import { User } from '@/user/entities/user.entity';
import { Vote } from '@/vote/entities/vote.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';

export enum PostType {
  DISCUSSION = 'discussion',
  ANALYSIS = 'analysis',
  NEWS = 'news',
  QUESTION = 'question',
}

@Entity('community_posts')
@Tree('materialized-path')
@Index(['author', 'createdAt'])
@Index(['type', 'createdAt'])
@Index(['createdAt'])
export class CommunityPost {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column()
  title?: string;

  @Column({ type: 'text' })
  content?: string;

  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.DISCUSSION,
  })
  type?: PostType;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ default: 0 })
  upvotes?: number;

  @Column({ default: 0 })
  downvotes?: number;

  @Column({ default: 0 })
  views?: number;

  @Column({ default: false })
  isPinned?: boolean;

  @Column({ default: false })
  isLocked?: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.communityPosts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @Column({ name: 'author_id' })
  authorId?: string;

  @TreeChildren()
  replies?: CommunityPost[];

  @TreeParent()
  parent?: CommunityPost;

  @OneToMany(() => Vote, (vote) => vote.post)
  votes?: Vote[];
}
