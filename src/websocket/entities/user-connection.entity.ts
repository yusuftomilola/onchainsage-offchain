import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("user_connections")
@Index(["userId", "isActive"])
export class UserConnection {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: string

  @Column()
  socketId: string

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  connectedAt: Date

  @Column({ nullable: true })
  disconnectedAt?: Date

  @Column({ nullable: true })
  userAgent?: string

  @Column({ nullable: true })
  ipAddress?: string
}
