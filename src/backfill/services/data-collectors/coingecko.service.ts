import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { HttpService } from "@nestjs/axios"
import { firstValueFrom } from "rxjs"
import type { RateLimiterService } from "../rate-limiter.service"

export interface CoinGeckoHistoricalData {
  prices: [number, number][]
  market_caps: [number, number][]
  total_volumes: [number, number][]
}

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name)
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimiterService: RateLimiterService,
  ) {
    this.baseUrl = this.configService.get("backfill.dataSources.coingecko.baseUrl")
    this.apiKey = this.configService.get("backfill.dataSources.coingecko.apiKey")
  }

  async getHistoricalData(coinId: string, fromDate: Date, toDate: Date): Promise<CoinGeckoHistoricalData> {
    await this.rateLimiterService.waitForRateLimit("coingecko")

    const fromTimestamp = Math.floor(fromDate.getTime() / 1000)
    const toTimestamp = Math.floor(toDate.getTime() / 1000)

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/coins/${coinId}/market_chart/range`, {
          params: {
            vs_currency: "usd",
            from: fromTimestamp,
            to: toTimestamp,
          },
          headers: this.apiKey ? { "X-CG-Pro-API-Key": this.apiKey } : {},
        }),
      )

      return response.data
    } catch (error) {
      this.logger.error(`Failed to fetch historical data for ${coinId}:`, error.message)
      throw error
    }
  }

  async getCoinsList(): Promise<Array<{ id: string; symbol: string; name: string }>> {
    await this.rateLimiterService.waitForRateLimit("coingecko")

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/coins/list`, {
          headers: this.apiKey ? { "X-CG-Pro-API-Key": this.apiKey } : {},
        }),
      )

      return response.data
    } catch (error) {
      this.logger.error("Failed to fetch coins list:", error.message)
      throw error
    }
  }
}
