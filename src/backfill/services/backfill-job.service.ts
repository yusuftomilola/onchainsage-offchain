import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type BackfillJob, BackfillJobStatus, type BackfillJobType } from "../entities/backfill-job.entity"
import type { Token } from "../entities/token.entity"

export interface CreateBackfillJobDto {
  type: BackfillJobType
  tokenIds: string[]
  startDate: Date
  endDate: Date
  configuration?: Record<string, any>
}

@Injectable()
export class BackfillJobService {
  private readonly logger = new Logger(BackfillJobService.name)

  constructor(
    private readonly backfillJobRepository: Repository<BackfillJob>,
    private readonly tokenRepository: Repository<Token>,
  ) {}

  async createJob(dto: CreateBackfillJobDto): Promise<BackfillJob> {
    // Validate tokens exist
    const tokens = await this.tokenRepository.findByIds(dto.tokenIds)
    if (tokens.length !== dto.tokenIds.length) {
      throw new Error("Some tokens not found")
    }

    // Calculate total batches estimate
    const daysDiff = Math.ceil((dto.endDate.getTime() - dto.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalBatches = Math.ceil((daysDiff * dto.tokenIds.length) / 10) // Estimate 10 items per batch

    const job = this.backfillJobRepository.create({
      type: dto.type,
      tokenIds: dto.tokenIds,
      startDate: dto.startDate,
      endDate: dto.endDate,
      currentDate: dto.startDate,
      totalBatches,
      configuration: dto.configuration || {},
      metadata: {
        estimatedDuration: totalBatches * 30, // 30 seconds per batch estimate
        tokensCount: dto.tokenIds.length,
        daysRange: daysDiff,
      },
    })

    return this.backfillJobRepository.save(job)
  }

  async updateJobProgress(
    jobId: string,
    completedBatches: number,
    currentDate?: Date,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const job = await this.backfillJobRepository.findOne({ where: { id: jobId } })
    if (!job) throw new Error("Job not found")

    const progressPercentage = (completedBatches / job.totalBatches) * 100

    await this.backfillJobRepository.update(jobId, {
      completedBatches,
      progressPercentage: progressPercentage.toFixed(2),
      currentDate: currentDate || job.currentDate,
      metadata: { ...job.metadata, ...metadata },
      updatedAt: new Date(),
    })
  }

  async updateJobStatus(jobId: string, status: BackfillJobStatus, errorMessage?: string): Promise<void> {
    const updateData: Partial<BackfillJob> = {
      status,
      updatedAt: new Date(),
    }

    if (status === BackfillJobStatus.RUNNING && !errorMessage) {
      updateData.startedAt = new Date()
    } else if (status === BackfillJobStatus.COMPLETED) {
      updateData.completedAt = new Date()
      updateData.progressPercentage = "100.00"
    } else if (status === BackfillJobStatus.FAILED && errorMessage) {
      updateData.errorMessage = errorMessage
    }

    await this.backfillJobRepository.update(jobId, updateData)
  }

  async getJob(jobId: string): Promise<BackfillJob> {
    const job = await this.backfillJobRepository.findOne({ where: { id: jobId } })
    if (!job) throw new Error("Job not found")
    return job
  }

  async getActiveJobs(): Promise<BackfillJob[]> {
    return this.backfillJobRepository.find({
      where: [{ status: BackfillJobStatus.PENDING }, { status: BackfillJobStatus.RUNNING }],
      order: { createdAt: "ASC" },
    })
  }

  async getJobHistory(limit = 50): Promise<BackfillJob[]> {
    return this.backfillJobRepository.find({
      order: { createdAt: "DESC" },
      take: limit,
    })
  }

  async pauseJob(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, BackfillJobStatus.PAUSED)
  }

  async resumeJob(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, BackfillJobStatus.PENDING)
  }

  async getJobStats(): Promise<{
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    paused: number
  }> {
    const [total, pending, running, completed, failed, paused] = await Promise.all([
      this.backfillJobRepository.count(),
      this.backfillJobRepository.count({ where: { status: BackfillJobStatus.PENDING } }),
      this.backfillJobRepository.count({ where: { status: BackfillJobStatus.RUNNING } }),
      this.backfillJobRepository.count({ where: { status: BackfillJobStatus.COMPLETED } }),
      this.backfillJobRepository.count({ where: { status: BackfillJobStatus.FAILED } }),
      this.backfillJobRepository.count({ where: { status: BackfillJobStatus.PAUSED } }),
    ])

    return { total, pending, running, completed, failed, paused }
  }
}
