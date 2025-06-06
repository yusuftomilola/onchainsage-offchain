import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("connection_metrics")
@Index(["timestamp"])
export class ConnectionMetrics {
  @PrimaryGeneratedColumn()
  id: number

  @CreateDateColumn()
  timestamp: Date

  @Column({ default: 0 })
  activeConnections: number

  @Column({ default: 0 })
  onlineUsers: number

  @Column({ default: 0 })
  messagesSent: number

  @Column({ default: 0 })
  messagesQueued: number

  @Column({ default: 0 })
  connectionsTotal: number

  @Column({ default: 0 })
  disconnectionsTotal: number

  @Column({ default: 0 })
  errorsTotal: number

  @Column("jsonb", { nullable: true })
  queueStats?: any
}
