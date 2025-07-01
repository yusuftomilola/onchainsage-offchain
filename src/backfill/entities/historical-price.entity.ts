import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "typeorm"
import { Token } from "./token.entity"

@Entity("historical_prices")
@Index(["tokenId", "timestamp", "source"], { unique: true })
@Index(["timestamp"])
@Index(["tokenId", "timestamp"])
export class HistoricalPrice {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("uuid")
  tokenId: string

  @ManyToOne(
    () => Token,
    (token) => token.historicalPrices,
  )
  @JoinColumn({ name: "tokenId" })
  token: Token

  @Column({ type: "decimal", precision: 18, scale: 8 })
  price: string

  @Column({ type: "decimal", precision: 18, scale: 8 })
  volume24h: string

  @Column({ type: "decimal", precision: 18, scale: 8 })
  marketCap: string

  @Column()
  source: string // 'uniswap', 'pancakeswap', 'coingecko', etc.

  @Column({ type: "timestamp" })
  timestamp: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date
}
