import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('tweets')
export class Tweet {
  @PrimaryColumn()
  id!: string;

  @Column('text')
  text!: string;

  @Column()
  authorId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  score?: number;
}
