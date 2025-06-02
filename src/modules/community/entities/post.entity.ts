import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable, Index } from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Tag } from './tag.entity';
import { Comment } from './comment.entity';
import { Vote } from './vote.entity';

@Entity('posts')
@Index(['title', 'content'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column('text')
  title: string | undefined;

  @Column('text')
  content: string | undefined;

  @Column('integer', { default: 0 })
  upvotes: number | undefined;

  @Column('integer', { default: 0 })
  downvotes: number | undefined;

  @Column('integer', { default: 0 })
  views: number | undefined;

  @Column('boolean', { default: false })
  isPinned: boolean | undefined;

  @Column('boolean', { default: false })
  isLocked: boolean | undefined;

  @Column('boolean', { default: true })
  isActive: boolean | undefined;

  @Column('text', { nullable: true })
  moderatorNote: string | undefined;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date | undefined;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date | undefined;

  @ManyToOne(() => User, user => user.posts)
  author: User | undefined;

  @ManyToOne(() => Category, category => category.posts)
  category: Category | undefined;

  @ManyToMany(() => Tag, tag => tag.posts)
  @JoinTable()
  tags: Tag[] | undefined;

  @OneToMany(() => Comment, comment => comment.post)
  comments: Comment[] | undefined;

  @OneToMany(() => Vote, vote => vote.post)
  votes: Vote[] | undefined;

  get score(): number {
    return (this.upvotes ?? 0) - (this.downvotes ?? 0);
  }
}
