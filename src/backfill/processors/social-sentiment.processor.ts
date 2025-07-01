import { Processor } from "@nestjs/bull"
import type { Job } from "bull"
import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { SocialSentiment } from "../entities/social-sentiment.entity"
import type { Token } from "../entities/token.entity"
import type { SocialMediaService } from "../services/data-collectors/social-media.service"
import type { DataValidationService } from "../services/data-validation.service"
import type { BackfillJobService } from "../services/backfill-job.service"

export interface SocialSentimentJobData {
  jobId: string
  tokenId: string
  startDate: Date
  endDate: Date
  platforms: string[]
  batchSize: number
}

@Injectable()
export class SocialSentimentProcessor {
  private readonly logger = new Logger(SocialSentimentProcessor.name)

  private socialSentimentRepository: Repository<SocialSentiment>
  private tokenRepository: Repository<Token>
  private socialMediaService: SocialMediaService
  private dataValidationService: DataValidationService
  private backfillJobService: BackfillJobService

  constructor(
    socialSentimentRepository: Repository<SocialSentiment>,
    tokenRepository: Repository<Token>,
    socialMediaService: SocialMediaService,
    dataValidationService: DataValidationService,
    backfillJobService: BackfillJobService,
  ) {
    this.socialSentimentRepository = socialSentimentRepository
    this.tokenRepository = tokenRepository
    this.socialMediaService = socialMediaService
    this.dataValidationService = dataValidationService
    this.backfillJobService = backfillJobService
  }

  @Processor("social-sentiment")
  async handleSocialSentimentCollection(job: Job<SocialSentimentJobData>) {
    const { jobId, tokenId, startDate, endDate, platforms, batchSize } = job.data

    this.logger.log(`Processing social sentiment for token ${tokenId}, job ${jobId}`)

    try {
      const token = await this.tokenRepository.findOne({ where: { id: tokenId } })
      if (!token) {
        throw new Error(`Token ${tokenId} not found`)
      }

      await job.progress(10)

      const allSentimentData = []

      // Process each platform
      for (const platform of platforms) {
        try {
          let posts = []

          if (platform === "twitter") {
            posts = await this.socialMediaService.getTwitterMentions(
              `$${token.symbol}`,
              new Date(startDate),
              new Date(endDate),
            )
          } else if (platform === "reddit") {
            posts = await this.socialMediaService.getRedditMentions(
              "cryptocurrency",
              token.symbol,
              new Date(startDate),
              new Date(endDate),
            )
          }

          // Group posts by day and calculate sentiment
          const dailySentiment = this.aggregateDailySentiment(posts, platform)

          const sentimentData = dailySentiment.map((data) => ({
            tokenId,
            platform,
            sentimentScore: data.sentimentScore.toString(),
            mentionCount: data.mentionCount,
            positiveCount: data.positiveCount,
            negativeCount: data.negativeCount,
            neutralCount: data.neutralCount,
            timestamp: data.date,
            metadata: {
              topMentions: data.topMentions,
              averageEngagement: data.averageEngagement,
            },
          }))

          allSentimentData.push(...sentimentData)
        } catch (error) {
          this.logger.error(`Failed to collect ${platform} data for ${token.symbol}:`, error.message)
        }
      }

      await job.progress(70)

      // Validate data
      const validationResult = this.dataValidationService.validateSocialSentimentData(allSentimentData)

      if (!validationResult.isValid) {
        this.logger.warn(`Social sentiment validation warnings: ${validationResult.errors.join(", ")}`)
      }

      await job.progress(80)

      // Save data in batches
      const batches = this.chunkArray(allSentimentData, batchSize)
      let savedCount = 0

      for (const batch of batches) {
        // Check for existing data
        const existingData = await this.socialSentimentRepository.find({
          where: batch.map((item) => ({
            tokenId: item.tokenId,
            timestamp: item.timestamp,
            platform: item.platform,
          })),
        })

        const existingKeys = new Set(
          existingData.map((item) => `${item.tokenId}-${item.timestamp.getTime()}-${item.platform}`),
        )

        const newData = batch.filter(
          (item) => !existingKeys.has(`${item.tokenId}-${item.timestamp.getTime()}-${item.platform}`),
        )

        if (newData.length > 0) {
          await this.socialSentimentRepository.save(newData)
          savedCount += newData.length
        }
      }

      await job.progress(100)

      // Update job progress
      await this.backfillJobService.updateJobProgress(jobId, 1, new Date(endDate), {
        processedTokens: 1,
        savedRecords: savedCount,
        validationAccuracy: validationResult.accuracy,
        platforms: platforms,
      })

      this.logger.log(`Successfully processed ${savedCount} sentiment records for token ${token.symbol}`)

      return {
        success: true,
        recordsProcessed: allSentimentData.length,
        recordsSaved: savedCount,
        validationAccuracy: validationResult.accuracy,
      }
    } catch (error) {
      this.logger.error(`Failed to process social sentiment for job ${jobId}:`, error.message)
      throw error
    }
  }

  private aggregateDailySentiment(posts: any[], platform: string) {
    const dailyData = new Map()

    posts.forEach((post) => {
      const dateKey = post.createdAt.toISOString().split("T")[0]

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: new Date(dateKey),
          posts: [],
          totalEngagement: 0,
        })
      }

      const sentiment = this.socialMediaService.calculateSentiment(post.text)
      post.sentiment = sentiment

      dailyData.get(dateKey).posts.push(post)
      dailyData.get(dateKey).totalEngagement += post.metrics.likes + post.metrics.shares + post.metrics.comments
    })

    return Array.from(dailyData.values()).map((dayData) => {
      const posts = dayData.posts
      const mentionCount = posts.length

      let positiveCount = 0
      let negativeCount = 0
      let neutralCount = 0
      let totalSentiment = 0

      posts.forEach((post) => {
        totalSentiment += post.sentiment
        if (post.sentiment > 0.1) positiveCount++
        else if (post.sentiment < -0.1) negativeCount++
        else neutralCount++
      })

      const averageSentiment = mentionCount > 0 ? totalSentiment / mentionCount : 0

      return {
        date: dayData.date,
        sentimentScore: averageSentiment,
        mentionCount,
        positiveCount,
        negativeCount,
        neutralCount,
        topMentions: posts
          .sort((a, b) => b.metrics.likes + b.metrics.shares - (a.metrics.likes + a.metrics.shares))
          .slice(0, 5)
          .map((p) => ({ text: p.text.substring(0, 100), author: p.author })),
        averageEngagement: mentionCount > 0 ? dayData.totalEngagement / mentionCount : 0,
      }
    })
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}
