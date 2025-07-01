import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm"
import { Token } from "./token.entity"

@Entity("trading_patterns")
@Index(["tokenId", "timestamp", "timeframe"])
@Index(["timestamp"])
export class TradingPattern {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  tokenId: string

  @ManyToOne(
    () => Token,
    (token) => token.tradingPatterns,
  )
  @JoinColumn({ name: "tokenId" })
  token: Token

  @Column()
  timeframe: string // '1h', '4h', '1d', etc.

  @Column({ type: "decimal", precision: 18, scale: 8 })
  open: string

  @Column({ type: "decimal", precision: 18, scale: 8 })
  high: string

  @Column({ type: "decimal", precision: 18, scale: 8 })
  low: string

  @Column({ type: "decimal", precision: 18, scale: 8 })
  close: string

  @Column({ type: "decimal", precision: 18, scale: 8 })
  volume: string

  @Column({ type: "int" })
  tradeCount: number

  @Column({ type: "timestamp" })
  timestamp: Date

  @Column({ type: "jsonb", nullable: true })
  technicalIndicators: Record<string, any>

  @CreateDateColumn()
  createdAt: Date
}
