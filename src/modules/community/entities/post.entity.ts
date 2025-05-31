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

  @Column()
  title: string | undefined;

  @Column('text')
  content: string | undefined;

  @Column({ default: 0 })
  upvotes: number | undefined;

  @Column({ default: 0 })
  downvotes: number | undefined;

  @Column({ default: 0 })
  views: number | undefined;

  @Column({ default: false })
  isPinned: boolean | undefined;

  @Column({ default: false })
  isLocked: boolean | undefined;

  @Column({ default: true })
  isActive: boolean | undefined;

  @Column({ nullable: true })
  moderatorNote: string | undefined;

  @CreateDateColumn()
  createdAt: Date | undefined;

  @UpdateDateColumn()
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
