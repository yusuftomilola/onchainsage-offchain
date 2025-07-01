import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from "typeorm"
import { HistoricalPrice } from "./historical-price.entity"
import { SocialSentiment } from "./social-sentiment.entity"
import { TradingPattern } from "./trading-pattern.entity"

@Entity("tokens")
@Index(["symbol", "address"], { unique: true })
export class Token {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  symbol: string

  @Column()
  name: string

  @Column()
  address: string

  @Column()
  network: string

  @Column({ type: "decimal", precision: 18, scale: 8, default: 18 })
  decimals: number

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(
    () => HistoricalPrice,
    (price) => price.token,
  )
  historicalPrices: HistoricalPrice[]

  @OneToMany(
    () => SocialSentiment,
    (sentiment) => sentiment.token,
  )
  socialSentiments: SocialSentiment[]

  @OneToMany(
    () => TradingPattern,
    (pattern) => pattern.token,
  )
  tradingPatterns: TradingPattern[]
}
