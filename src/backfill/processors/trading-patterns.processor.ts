import { Processor, Process } from "@nestjs/bull"
import type { Job } from "bull"
import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { TradingPattern } from "../entities/trading-pattern.entity"
import type { HistoricalPrice } from "../entities/historical-price.entity"
import type { Token } from "../entities/token.entity"
import type { DataValidationService } from "../services/data-validation.service"
import type { BackfillJobService } from "../services/backfill-job.service"

export interface TradingPatternsJobData {
  jobId: string
  tokenId: string
  startDate: Date
  endDate: Date
  timeframes: string[]
  batchSize: number
}

@Injectable()
export class TradingPatternsProcessor {
  private readonly logger = new Logger(TradingPatternsProcessor.name)

  constructor(
    private readonly tradingPatternRepository: Repository<TradingPattern>,
    private readonly historicalPriceRepository: Repository<HistoricalPrice>,
    private readonly tokenRepository: Repository<Token>,
    private readonly dataValidationService: DataValidationService,
    private readonly backfillJobService: BackfillJobService,
  ) {}

  @Process("collect-trading-patterns")
  async handleTradingPatternsCollection(job: Job<TradingPatternsJobData>) {
    const { jobId, tokenId, startDate, endDate, timeframes, batchSize } = job.data

    this.logger.log(`Processing trading patterns for token ${tokenId}, job ${jobId}`)

    try {
      const token = await this.tokenRepository.findOne({ where: { id: tokenId } })
      if (!token) {
        throw new Error(`Token ${tokenId} not found`)
      }

      await job.progress(10)

      // Get historical price data
      const historicalPrices = await this.historicalPriceRepository.find({
        where: {
          tokenId,
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          } as any,
        },
        order: { timestamp: "ASC" },
      })

      if (historicalPrices.length === 0) {
        this.logger.warn(`No historical price data found for token ${tokenId}`)
        return { success: true, recordsProcessed: 0, recordsSaved: 0 }
      }

      await job.progress(30)

      const allTradingPatterns = []

      // Generate patterns for each timeframe
      for (const timeframe of timeframes) {
        const patterns = this.generateTradingPatterns(historicalPrices, timeframe)
        allTradingPatterns.push(
          ...patterns.map((pattern) => ({
            ...pattern,
            tokenId,
            timeframe,
          })),
        )
      }

      await job.progress(70)

      // Validate data
      const validationResult = this.dataValidationService.validateTradingPatternData(allTradingPatterns)

      if (!validationResult.isValid) {
        throw new Error(`Trading pattern validation failed: ${validationResult.errors.join(", ")}`)
      }

      await job.progress(80)

      // Save data in batches
      const batches = this.chunkArray(allTradingPatterns, batchSize)
      let savedCount = 0

      for (const batch of batches) {
        // Check for existing data
        const existingData = await this.tradingPatternRepository.find({
          where: batch.map((item) => ({
            tokenId: item.tokenId,
            timestamp: item.timestamp,
            timeframe: item.timeframe,
          })),
        })

        const existingKeys = new Set(
          existingData.map((item) => `${item.tokenId}-${item.timestamp.getTime()}-${item.timeframe}`),
        )

        const newData = batch.filter(
          (item) => !existingKeys.has(`${item.tokenId}-${item.timestamp.getTime()}-${item.timeframe}`),
        )

        if (newData.length > 0) {
          await this.tradingPatternRepository.save(newData)
          savedCount += newData.length
        }
      }

      await job.progress(100)

      // Update job progress
      await this.backfillJobService.updateJobProgress(jobId, 1, new Date(endDate), {
        processedTokens: 1,
        savedRecords: savedCount,
        validationAccuracy: validationResult.accuracy,
        timeframes: timeframes,
      })

      this.logger.log(`Successfully processed ${savedCount} trading pattern records for token ${token.symbol}`)

      return {
        success: true,
        recordsProcessed: allTradingPatterns.length,
        recordsSaved: savedCount,
        validationAccuracy: validationResult.accuracy,
      }
    } catch (error) {
      this.logger.error(`Failed to process trading patterns for job ${jobId}:`, error.message)
      throw error
    }
  }

  private generateTradingPatterns(prices: any[], timeframe: string) {
    const patterns = []
    const intervalMs = this.getIntervalMs(timeframe)

    // Group prices by time intervals
    const groupedPrices = this.groupPricesByInterval(prices, intervalMs)

    for (const [timestamp, priceGroup] of groupedPrices) {
      if (priceGroup.length === 0) continue

      const sortedPrices = priceGroup.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      const open = Number.parseFloat(sortedPrices[0].price)
      const close = Number.parseFloat(sortedPrices[sortedPrices.length - 1].price)
      const high = Math.max(...sortedPrices.map((p) => Number.parseFloat(p.price)))
      const low = Math.min(...sortedPrices.map((p) => Number.parseFloat(p.price)))
      const volume = sortedPrices.reduce((sum, p) => sum + Number.parseFloat(p.volume24h), 0)
      const tradeCount = sortedPrices.length

      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators({
        open,
        high,
        low,
        close,
        volume,
      })

      patterns.push({
        open: open.toString(),
        high: high.toString(),
        low: low.toString(),
        close: close.toString(),
        volume: volume.toString(),
        tradeCount,
        timestamp: new Date(timestamp),
        technicalIndicators,
      })
    }

    return patterns
  }

  private getIntervalMs(timeframe: string): number {
    const intervals = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
      "1w": 7 * 24 * 60 * 60 * 1000,
    }

    return intervals[timeframe] || intervals["1h"]
  }

  private groupPricesByInterval(prices: any[], intervalMs: number): Map<number, any[]> {
    const grouped = new Map()

    prices.forEach((price) => {
      const timestamp = new Date(price.timestamp).getTime()
      const intervalStart = Math.floor(timestamp / intervalMs) * intervalMs

      if (!grouped.has(intervalStart)) {
        grouped.set(intervalStart, [])
      }

      grouped.get(intervalStart).push(price)
    })

    return grouped
  }

  private calculateTechnicalIndicators(ohlcv: {
    open: number
    high: number
    low: number
    close: number
    volume: number
  }) {
    // Simple technical indicators - in production, use a proper TA library
    const { open, high, low, close, volume } = ohlcv

    return {
      // Price change
      priceChange: close - open,
      priceChangePercent: ((close - open) / open) * 100,

      // Volatility
      volatility: ((high - low) / open) * 100,

      // Volume indicators
      volumeWeightedPrice: volume > 0 ? (high + low + close) / 3 : close,

      // Basic momentum
      momentum: close > open ? 1 : close < open ? -1 : 0,

      // Range indicators
      trueRange: Math.max(high - low, Math.abs(high - close), Math.abs(low - close)),
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}

// Decorator should be applied outside the class definition
const TradingPatternsProcessorWithProcessor = Processor("trading-patterns")(TradingPatternsProcessor)
