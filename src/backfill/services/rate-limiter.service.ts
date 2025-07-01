import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"

interface RateLimitConfig {
  requests: number
  windowMs: number
  lastReset: number
  currentCount: number
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name)
  private readonly rateLimits = new Map<string, RateLimitConfig>()

  constructor(private readonly configService: ConfigService) {
    this.initializeRateLimits()
  }

  private initializeRateLimits() {
    const dataSources = this.configService.get("backfill.dataSources")

    Object.entries(dataSources).forEach(([source, config]: [string, any]) => {
      if (config.rateLimit) {
        this.rateLimits.set(source, {
          requests: config.rateLimit,
          windowMs: 60000, // 1 minute default
          lastReset: Date.now(),
          currentCount: 0,
        })
      }
    })
  }

  async waitForRateLimit(source: string): Promise<void> {
    const config = this.rateLimits.get(source)
    if (!config) return

    const now = Date.now()

    // Reset counter if window has passed
    if (now - config.lastReset >= config.windowMs) {
      config.currentCount = 0
      config.lastReset = now
    }

    // If we've hit the limit, wait
    if (config.currentCount >= config.requests) {
      const waitTime = config.windowMs - (now - config.lastReset)
      this.logger.debug(`Rate limit hit for ${source}, waiting ${waitTime}ms`)

      await new Promise((resolve) => setTimeout(resolve, waitTime))

      // Reset after waiting
      config.currentCount = 0
      config.lastReset = Date.now()
    }

    config.currentCount++
  }

  async exponentialBackoff(attempt: number, baseDelay = 1000): Promise<void> {
    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
    this.logger.debug(`Exponential backoff: attempt ${attempt}, waiting ${delay}ms`)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
}
