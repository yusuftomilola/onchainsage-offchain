import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Post } from './post.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ unique: true })
  name: string | undefined;

  @Column()
  description: string | undefined;

  @Column()
  slug: string | undefined;

  @Column({ default: '#3B82F6' })
  color: string | undefined;

  @Column({ default: true })
  isActive: boolean | undefined;

  @CreateDateColumn()
  createdAt: Date | undefined;

  @UpdateDateColumn()
  updatedAt: Date | undefined;

  @OneToMany(() => Post, post => post.category)
  posts: Post[] | undefined;
}
