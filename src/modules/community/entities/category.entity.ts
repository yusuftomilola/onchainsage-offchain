import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Post } from './post.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column('text', { unique: true })
  name: string | undefined;

  @Column('text')
  description: string | undefined;

  @Column('text')
  slug: string | undefined;

  @Column('varchar', { length: 7, default: '#3B82F6' })
  color: string | undefined;

  @Column('boolean', { default: true })
  isActive: boolean | undefined;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date | undefined;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date | undefined;

  @OneToMany(() => Post, post => post.category)
  posts: Post[] | undefined;
}
