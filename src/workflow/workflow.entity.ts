import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity()
export class WorkflowEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @ManyToOne(() => WorkflowEntity, { nullable: true })
  parent!: WorkflowEntity;

  @Column()
  jobId!: number;
}