import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Post } from './post.entity';
import { Comment } from './comment.entity';
import { Vote } from './vote.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { unique: true })
  username: string | undefined;

  @Column('text', { unique: true })
  email!: string;

  @Column('text')
  password!: string;

  @Column('text', { nullable: true })
  avatar!: string;

  @Column('text', { nullable: true })
  bio!: string;

  @Column('integer', { default: 0 })
  reputation!: number;

  @Column('text', { default: 'user' })
  role!: string;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToMany(() => Post, post => post.author)
  posts!: Post[];

  @OneToMany(() => Comment, comment => comment.author)
  comments!: Comment[];

  @OneToMany(() => Vote, vote => vote.user)
  votes!: Vote[];
}