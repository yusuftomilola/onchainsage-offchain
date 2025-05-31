import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { Post } from './post.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ unique: true })
  name: string | undefined;

  @Column()
  slug: string | undefined;

  @Column({ default: '#6B7280' })
  color: string | undefined;

  @CreateDateColumn()
  createdAt: Date | undefined;

  @ManyToMany(() => Post, post => post.tags)
  posts: Post[] | undefined;
}
