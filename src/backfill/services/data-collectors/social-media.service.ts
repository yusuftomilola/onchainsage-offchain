import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { HttpService } from "@nestjs/axios"
import { firstValueFrom } from "rxjs"
import type { RateLimiterService } from "../rate-limiter.service"

export interface SocialMediaPost {
  id: string
  text: string
  createdAt: Date
  author: string
  platform: string
  metrics: {
    likes: number
    shares: number
    comments: number
  }
  sentiment?: number
}

@Injectable()
export class SocialMediaService {
  private readonly logger = new Logger(SocialMediaService.name)

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  async getTwitterMentions(query: string, fromDate: Date, toDate: Date): Promise<SocialMediaPost[]> {
    await this.rateLimiterService.waitForRateLimit("twitter")

    const bearerToken = this.configService.get("backfill.dataSources.twitter.bearerToken")
    const baseUrl = this.configService.get("backfill.dataSources.twitter.baseUrl")

    if (!bearerToken) {
      this.logger.warn("Twitter bearer token not configured")
      return []
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/tweets/search/all`, {
          params: {
            query: `${query} -is:retweet`,
            start_time: fromDate.toISOString(),
            end_time: toDate.toISOString(),
            max_results: 100,
            "tweet.fields": "created_at,author_id,public_metrics,text",
            "user.fields": "username",
            expansions: "author_id",
          },
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        }),
      )

      const tweets = response.data.data || []
      const users = response.data.includes?.users || []
      const userMap = new Map(users.map((user) => [user.id, user.username]))

      return tweets.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: new Date(tweet.created_at),
        author: userMap.get(tweet.author_id) || "unknown",
        platform: "twitter",
        metrics: {
          likes: tweet.public_metrics.like_count,
          shares: tweet.public_metrics.retweet_count,
          comments: tweet.public_metrics.reply_count,
        },
      }))
    } catch (error) {
      this.logger.error(`Failed to fetch Twitter mentions for ${query}:`, error.message)
      return []
    }
  }

  async getRedditMentions(subreddit: string, query: string, fromDate: Date, toDate: Date): Promise<SocialMediaPost[]> {
    await this.rateLimiterService.waitForRateLimit("reddit")

    try {
      // Reddit API implementation would go here
      // For now, returning empty array as Reddit API requires OAuth setup
      this.logger.warn("Reddit API not fully implemented")
      return []
    } catch (error) {
      this.logger.error(`Failed to fetch Reddit mentions:`, error.message)
      return []
    }
  }

  calculateSentiment(text: string): number {
    // Simple sentiment analysis - in production, use a proper NLP service
    const positiveWords = ["good", "great", "excellent", "amazing", "bullish", "moon", "pump"]
    const negativeWords = ["bad", "terrible", "awful", "bearish", "dump", "crash", "scam"]

    const words = text.toLowerCase().split(/\s+/)
    let score = 0

    words.forEach((word) => {
      if (positiveWords.includes(word)) score += 1
      if (negativeWords.includes(word)) score -= 1
    })

    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score / Math.max(1, words.length / 10)))
  }
}
