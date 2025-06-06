import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("notifications")
@Index(["userId", "isRead"])
@Index(["userId", "createdAt"])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: string

  @Column()
  title: string

  @Column("text")
  message: string

  @Column({
    type: "enum",
    enum: ["INFO", "WARNING", "ERROR", "SUCCESS", "TRADING_SIGNAL", "FORUM_UPDATE"],
  })
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "TRADING_SIGNAL" | "FORUM_UPDATE"

  @Column({
    type: "enum",
    enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
    default: "MEDIUM",
  })
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"

  @Column("jsonb", { nullable: true })
  metadata?: any

  @Column({ nullable: true })
  actionUrl?: string

  @Column({ default: false })
  isRead: boolean

  @CreateDateColumn()
  createdAt: Date

  @Column({ nullable: true })
  readAt?: Date
}
