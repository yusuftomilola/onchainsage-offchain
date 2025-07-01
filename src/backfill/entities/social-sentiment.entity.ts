import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm"
import { Token } from "./token.entity"

@Entity("social_sentiments")
@Index(["tokenId", "timestamp", "platform"])
@Index(["timestamp"])
export class SocialSentiment {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  tokenId: string

  @ManyToOne(
    () => Token,
    (token) => token.socialSentiments,
  )
  @JoinColumn({ name: "tokenId" })
  token: Token

  @Column()
  platform: string // 'twitter', 'reddit', 'telegram', etc.

  @Column({ type: "decimal", precision: 5, scale: 4 })
  sentimentScore: string // -1 to 1

  @Column({ type: "int" })
  mentionCount: number

  @Column({ type: "int" })
  positiveCount: number

  @Column({ type: "int" })
  negativeCount: number

  @Column({ type: "int" })
  neutralCount: number

  @Column({ type: "timestamp" })
  timestamp: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date
}
