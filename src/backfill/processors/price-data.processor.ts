import { Process } from "@nestjs/bull"
import type { Job } from "bull"
import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { HistoricalPrice } from "../entities/historical-price.entity"
import type { Token } from "../entities/token.entity"
import type { CoinGeckoService } from "../services/data-collectors/coingecko.service"
import type { UniswapService } from "../services/data-collectors/uniswap.service"
import type { DataValidationService } from "../services/data-validation.service"
import type { BackfillJobService } from "../services/backfill-job.service"
import type { RateLimiterService } from "../services/rate-limiter.service"

export interface PriceDataJobData {
  jobId: string
  tokenId: string
  startDate: Date
  endDate: Date
  sources: string[]
  batchSize: number
}

@Injectable()
export class PriceDataProcessor {
  private readonly logger = new Logger(PriceDataProcessor.name)

  private readonly historicalPriceRepository: Repository<HistoricalPrice>
  private readonly tokenRepository: Repository<Token>
  private readonly coinGeckoService: CoinGeckoService
  private readonly uniswapService: UniswapService
  private readonly dataValidationService: DataValidationService
  private readonly backfillJobService: BackfillJobService
  private readonly rateLimiterService: RateLimiterService

  constructor(
    historicalPriceRepository: Repository<HistoricalPrice>,
    tokenRepository: Repository<Token>,
    coinGeckoService: CoinGeckoService,
    uniswapService: UniswapService,
    dataValidationService: DataValidationService,
    backfillJobService: BackfillJobService,
    rateLimiterService: RateLimiterService,
  ) {
    this.historicalPriceRepository = historicalPriceRepository
    this.tokenRepository = tokenRepository
    this.coinGeckoService = coinGeckoService
    this.uniswapService = uniswapService
    this.dataValidationService = dataValidationService
    this.backfillJobService = backfillJobService
    this.rateLimiterService = rateLimiterService
  }

  @Process("collect-historical-prices")
  async handlePriceDataCollection(job: Job<PriceDataJobData>) {
    const { jobId, tokenId, startDate, endDate, sources, batchSize } = job.data

    this.logger.log(`Processing price data for token ${tokenId}, job ${jobId}`)

    try {
      const token = await this.tokenRepository.findOne({ where: { id: tokenId } })
      if (!token) {
        throw new Error(`Token ${tokenId} not found`)
      }

      // Update job progress
      await job.progress(10)

      const allPriceData = []

      // Collect from CoinGecko
      if (sources.includes("coingecko")) {
        try {
          const coinGeckoData = await this.coinGeckoService.getHistoricalData(
            token.symbol.toLowerCase(),
            new Date(startDate),
            new Date(endDate),
          )

          const priceData = coinGeckoData.prices.map(([timestamp, price], index) => ({
            tokenId,
            price: price.toString(),
            volume24h: coinGeckoData.total_volumes[index]?.[1]?.toString() || "0",
            marketCap: coinGeckoData.market_caps[index]?.[1]?.toString() || "0",
            source: "coingecko",
            timestamp: new Date(timestamp),
            metadata: {
              originalTimestamp: timestamp,
            },
          }))

          allPriceData.push(...priceData)
          await job.progress(40)
        } catch (error) {
          this.logger.error(`Failed to collect CoinGecko data for ${token.symbol}:`, error.message)
        }
      }

      // Collect from Uniswap
      if (sources.includes("uniswap")) {
        try {
          const uniswapData = await this.uniswapService.getTokenHistoricalData(
            token.address,
            Math.floor(new Date(startDate).getTime() / 1000),
            Math.floor(new Date(endDate).getTime() / 1000),
          )

          const priceData = uniswapData.map((data) => ({
            tokenId,
            price: data.priceUSD,
            volume24h: data.volumeUSD,
            marketCap: data.totalLiquidityUSD,
            source: "uniswap",
            timestamp: new Date(data.date * 1000),
            metadata: {
              txCount: data.txCount,
              originalDate: data.date,
            },
          }))

          allPriceData.push(...priceData)
          await job.progress(70)
        } catch (error) {
          this.logger.error(`Failed to collect Uniswap data for ${token.symbol}:`, error.message)
        }
      }

      // Validate data
      const validationResult = this.dataValidationService.validatePriceData(
        allPriceData.map((d) => ({
          price: Number.parseFloat(d.price),
          volume: Number.parseFloat(d.volume24h),
          timestamp: d.timestamp,
          source: d.source,
        })),
      )

      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(", ")}`)
      }

      await job.progress(80)

      // Save data in batches to avoid memory issues
      const batches = this.chunkArray(allPriceData, batchSize)
      let savedCount = 0

      for (const batch of batches) {
        // Check for existing data to avoid duplicates
        const existingData = await this.historicalPriceRepository.find({
          where: batch.map((item) => ({
            tokenId: item.tokenId,
            timestamp: item.timestamp,
            source: item.source,
          })),
        })

        const existingKeys = new Set(
          existingData.map((item) => `${item.tokenId}-${item.timestamp.getTime()}-${item.source}`),
        )

        const newData = batch.filter(
          (item) => !existingKeys.has(`${item.tokenId}-${item.timestamp.getTime()}-${item.source}`),
        )

        if (newData.length > 0) {
          await this.historicalPriceRepository.save(newData)
          savedCount += newData.length
        }

        // Small delay to prevent overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      await job.progress(100)

      // Update job progress in database
      await this.backfillJobService.updateJobProgress(jobId, 1, new Date(endDate), {
        processedTokens: 1,
        savedRecords: savedCount,
        validationAccuracy: validationResult.accuracy,
        warnings: validationResult.warnings,
      })

      this.logger.log(`Successfully processed ${savedCount} price records for token ${token.symbol}`)

      return {
        success: true,
        recordsProcessed: allPriceData.length,
        recordsSaved: savedCount,
        validationAccuracy: validationResult.accuracy,
      }
    } catch (error) {
      this.logger.error(`Failed to process price data for job ${jobId}:`, error.message)

      // Exponential backoff for retries
      if (job.attemptsMade < 3) {
        await this.rateLimiterService.exponentialBackoff(job.attemptsMade)
      }

      throw error
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
