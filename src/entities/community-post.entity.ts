import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('community_posts')
export class CommunityPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  content!: string;

  @Column()
  source!: string;

  @ManyToOne(() => User)
  author!: User;

  @Column('float', { default: 0 })
  sentimentScore: number = 0;

  @Column('float', { default: 0 })
  sentimentMagnitude: number = 0;

  @Column({
    type: 'enum',
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral',
  })
  sentiment!: 'positive' | 'negative' | 'neutral';

  @Column('simple-array', { default: [] })
  tags: string[] = [];

  @Column('simple-array', { default: [] })
  keywords: string[] = [];

  @Column('jsonb', { default: {} })
  metadata: Record<string, any> = {};

  @ManyToOne(() => CommunityPost, (post) => post.replies, { nullable: true })
  parentPost?: CommunityPost;

  @OneToMany(() => CommunityPost, (post) => post.parentPost)
  replies: CommunityPost[] = [];

  @Index()
  @CreateDateColumn()
  timestamp!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
