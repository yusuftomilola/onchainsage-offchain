import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("trading_signals")
@Index(["symbol", "createdAt"])
export class TradingSignal {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  symbol: string

  @Column({
    type: "enum",
    enum: ["BUY", "SELL", "HOLD"],
  })
  action: "BUY" | "SELL" | "HOLD"

  @Column("decimal", { precision: 10, scale: 2 })
  price: number

  @Column("decimal", { precision: 5, scale: 2 })
  confidence: number

  @Column("jsonb", { nullable: true })
  metadata?: any

  @CreateDateColumn()
  createdAt: Date
}
