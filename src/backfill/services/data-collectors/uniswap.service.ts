import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { HttpService } from "@nestjs/axios"
import { firstValueFrom } from "rxjs"
import type { RateLimiterService } from "../rate-limiter.service"

export interface UniswapTokenData {
  id: string
  symbol: string
  name: string
  derivedETH: string
  volumeUSD: string
  txCount: string
  totalLiquidity: string
}

export interface UniswapTokenDayData {
  date: number
  priceUSD: string
  volumeUSD: string
  totalLiquidityUSD: string
  txCount: string
}

@Injectable()
export class UniswapService {
  private readonly logger = new Logger(UniswapService.name)
  private readonly subgraphUrl: string

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimiterService: RateLimiterService,
  ) {
    this.subgraphUrl = this.configService.get("backfill.dataSources.uniswap.subgraphUrl")
  }

  async getTokenHistoricalData(
    tokenAddress: string,
    fromTimestamp: number,
    toTimestamp: number,
  ): Promise<UniswapTokenDayData[]> {
    await this.rateLimiterService.waitForRateLimit("uniswap")

    const query = `
      query GetTokenDayData($tokenAddress: String!, $fromTimestamp: Int!, $toTimestamp: Int!) {
        tokenDayDatas(
          where: {
            token: $tokenAddress,
            date_gte: $fromTimestamp,
            date_lte: $toTimestamp
          },
          orderBy: date,
          orderDirection: asc,
          first: 1000
        ) {
          date
          priceUSD
          volumeUSD
          totalLiquidityUSD
          txCount
        }
      }
    `

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.subgraphUrl, {
          query,
          variables: {
            tokenAddress: tokenAddress.toLowerCase(),
            fromTimestamp: Math.floor(fromTimestamp / 86400) * 86400,
            toTimestamp: Math.floor(toTimestamp / 86400) * 86400,
          },
        }),
      )

      return response.data.data.tokenDayDatas
    } catch (error) {
      this.logger.error(`Failed to fetch Uniswap data for ${tokenAddress}:`, error.message)
      throw error
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<UniswapTokenData> {
    await this.rateLimiterService.waitForRateLimit("uniswap")

    const query = `
      query GetToken($tokenAddress: String!) {
        token(id: $tokenAddress) {
          id
          symbol
          name
          derivedETH
          volumeUSD
          txCount
          totalLiquidity
        }
      }
    `

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.subgraphUrl, {
          query,
          variables: {
            tokenAddress: tokenAddress.toLowerCase(),
          },
        }),
      )

      return response.data.data.token
    } catch (error) {
      this.logger.error(`Failed to fetch token info for ${tokenAddress}:`, error.message)
      throw error
    }
  }
}
