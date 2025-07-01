import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum BackfillJobStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  PAUSED = "paused",
}

export enum BackfillJobType {
  PRICE_DATA = "price_data",
  SOCIAL_SENTIMENT = "social_sentiment",
  TRADING_PATTERNS = "trading_patterns",
}

@Entity("backfill_jobs")
@Index(["status", "type"])
@Index(["createdAt"])
export class BackfillJob {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "enum", enum: BackfillJobType })
  type: BackfillJobType

  @Column({ type: "enum", enum: BackfillJobStatus, default: BackfillJobStatus.PENDING })
  status: BackfillJobStatus

  @Column("simple-array")
  tokenIds: string[]

  @Column({ type: "timestamp" })
  startDate: Date

  @Column({ type: "timestamp" })
  endDate: Date

  @Column({ type: "timestamp", nullable: true })
  currentDate: Date

  @Column({ type: "int", default: 0 })
  totalBatches: number

  @Column({ type: "int", default: 0 })
  completedBatches: number

  @Column({ type: "int", default: 0 })
  failedBatches: number

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  progressPercentage: string

  @Column({ type: "jsonb", nullable: true })
  configuration: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "text", nullable: true })
  errorMessage: string

  @Column({ type: "timestamp", nullable: true })
  startedAt: Date

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
