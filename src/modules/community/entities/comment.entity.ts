import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Tree, TreeParent, TreeChildren } from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';
import { Vote } from './vote.entity';

@Entity('comments')
@Tree('materialized-path')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column('text')
  content: string | undefined;

  @Column('integer', { default: 0 })
  upvotes: number | undefined;

  @Column('integer', { default: 0 })
  downvotes: number | undefined;

  @Column('boolean', { default: true })
  isActive: boolean | undefined;

  @Column('text', { nullable: true })
  moderatorNote: string | undefined;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date | undefined;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date | undefined;

  @ManyToOne(() => User, user => user.comments)
  author: User | undefined;

  @ManyToOne(() => Post, post => post.comments)
  post: Post | undefined;

  @TreeParent()
  parent: Comment | undefined;

  @TreeChildren()
  children: Comment[] | undefined;

  @OneToMany(() => Vote, vote => vote.comment)
  votes: Vote[] | undefined;

  get score(): number {
    return (this.upvotes ?? 0) - (this.downvotes ?? 0);
  }
}
