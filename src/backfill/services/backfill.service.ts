import { Injectable, Logger } from "@nestjs/common"
import type { Queue } from "bull"
import type { ConfigService } from "@nestjs/config"
import type { BackfillJobService } from "./backfill-job.service"
import { BackfillJobStatus, BackfillJobType } from "../entities/backfill-job.entity"

@Injectable()
export class BackfillService {
  private readonly logger = new Logger(BackfillService.name)

  constructor(
    private readonly priceDataQueue: Queue,
    private readonly socialSentimentQueue: Queue,
    private readonly tradingPatternsQueue: Queue,
    private readonly backfillJobService: BackfillJobService,
    private readonly configService: ConfigService,
  ) {}

  async startBackfillJob(jobId: string): Promise<void> {
    const job = await this.backfillJobService.getJob(jobId)

    if (job.status !== BackfillJobStatus.PENDING) {
      throw new Error(`Job ${jobId} is not in pending status`)
    }

    await this.backfillJobService.updateJobStatus(jobId, BackfillJobStatus.RUNNING)

    const batchSize = this.configService.get("backfill.batchSize")
    const concurrency = this.configService.get("backfill.concurrency")

    try {
      // Create date ranges for processing
      const dateRanges = this.createDateRanges(job.startDate, job.endDate, 7) // 7-day chunks

      // Process each token in parallel (with concurrency limit)
      const tokenBatches = this.chunkArray(job.tokenIds, Math.ceil(job.tokenIds.length / concurrency))

      for (const tokenBatch of tokenBatches) {
        const promises = tokenBatch.map(async (tokenId) => {
          for (const dateRange of dateRanges) {
            await this.processTokenDateRange(job, tokenId, dateRange.start, dateRange.end, batchSize)
          }
        })

        // Process tokens in parallel with concurrency limit
        await Promise.all(promises)
      }

      await this.backfillJobService.updateJobStatus(jobId, BackfillJobStatus.COMPLETED)
      this.logger.log(`Backfill job ${jobId} completed successfully`)
    } catch (error) {
      this.logger.error(`Backfill job ${jobId} failed:`, error.message)
      await this.backfillJobService.updateJobStatus(jobId, BackfillJobStatus.FAILED, error.message)
      throw error
    }
  }

  private async processTokenDateRange(
    job: any,
    tokenId: string,
    startDate: Date,
    endDate: Date,
    batchSize: number,
  ): Promise<void> {
    const jobData = {
      jobId: job.id,
      tokenId,
      startDate,
      endDate,
      batchSize,
      ...job.configuration,
    }

    const jobOptions = {
      attempts: this.configService.get("backfill.retryAttempts"),
      backoff: {
        type: "exponential",
        delay: this.configService.get("backfill.retryDelay"),
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    }

    switch (job.type) {
      case BackfillJobType.PRICE_DATA:
        await this.priceDataQueue.add("collect-historical-prices", jobData, jobOptions)
        break

      case BackfillJobType.SOCIAL_SENTIMENT:
        await this.socialSentimentQueue.add("collect-social-sentiment", jobData, jobOptions)
        break

      case BackfillJobType.TRADING_PATTERNS:
        await this.tradingPatternsQueue.add("collect-trading-patterns", jobData, jobOptions)
        break

      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }
  }

  private createDateRanges(startDate: Date, endDate: Date, chunkDays: number): Array<{ start: Date; end: Date }> {
    const ranges = []
    let currentStart = new Date(startDate)

    while (currentStart < endDate) {
      const currentEnd = new Date(currentStart)
      currentEnd.setDate(currentEnd.getDate() + chunkDays)

      if (currentEnd > endDate) {
        currentEnd.setTime(endDate.getTime())
      }

      ranges.push({
        start: new Date(currentStart),
        end: new Date(currentEnd),
      })

      currentStart = new Date(currentEnd)
      currentStart.setDate(currentStart.getDate() + 1)
    }

    return ranges
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  async getQueueStats() {
    const [priceDataStats, socialSentimentStats, tradingPatternsStats] = await Promise.all([
      this.priceDataQueue.getJobCounts(),
      this.socialSentimentQueue.getJobCounts(),
      this.tradingPatternsQueue.getJobCounts(),
    ])

    return {
      priceData: priceDataStats,
      socialSentiment: socialSentimentStats,
      tradingPatterns: tradingPatternsStats,
    }
  }
}
