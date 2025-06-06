import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("websocket_messages")
@Index(["target", "delivered"])
export class Message {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  target: string // room name or user:userId

  @Column()
  event: string

  @Column("text")
  data: string // JSON stringified data

  @Column({ default: false })
  delivered: boolean

  @CreateDateColumn()
  createdAt: Date

  @Column({ nullable: true })
  deliveredAt?: Date
}
