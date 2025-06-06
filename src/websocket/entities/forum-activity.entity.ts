import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("forum_activities")
@Index(["forumId", "createdAt"])
@Index(["userId", "createdAt"])
export class ForumActivity {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  forumId: number

  @Column()
  userId: string

  @Column({
    type: "enum",
    enum: ["POST_CREATED", "POST_UPDATED", "POST_DELETED", "COMMENT_ADDED", "LIKE_ADDED", "USER_JOINED"],
  })
  activityType: "POST_CREATED" | "POST_UPDATED" | "POST_DELETED" | "COMMENT_ADDED" | "LIKE_ADDED" | "USER_JOINED"

  @Column({ nullable: true })
  entityId?: number

  @Column({
    type: "enum",
    enum: ["POST", "COMMENT"],
    nullable: true,
  })
  entityType?: "POST" | "COMMENT"

  @Column("jsonb", { nullable: true })
  metadata?: any

  @CreateDateColumn()
  createdAt: Date
}
