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

  @Column({ default: 0 })
  upvotes: number | undefined;

  @Column({ default: 0 })
  downvotes: number | undefined;

  @Column({ default: true })
  isActive: boolean | undefined;

  @Column({ nullable: true })
  moderatorNote: string | undefined;

  @CreateDateColumn()
  createdAt: Date | undefined;

  @UpdateDateColumn()
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
