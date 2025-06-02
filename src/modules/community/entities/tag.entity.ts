import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { Post } from './post.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column('text', { unique: true })
  name: string | undefined;

  @Column('text')
  slug: string | undefined;

  @Column('varchar', { length: 7, default: '#6B7280' })
  color: string | undefined;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date | undefined;

  @ManyToMany(() => Post, post => post.tags)
  posts: Post[] | undefined;
}
