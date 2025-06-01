import { getDexScreenerTokenData } from "@/common/http/dex-screener.client";
import { getRaydiumTokenData } from "@/common/http/radium.client";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TokenDataService {
  findAll() {
    throw new Error('Method not implemented.');
  }
  // Extract only the pair for this token
  findOne(_arg0: number) {
    throw new Error('Method not implemented.');
  }
  remove(_arg0: number) {
    throw new Error('Method not implemented.');
  }
  constructor() {}

  async fetchAndNormalizeTokenData(tokenAddress: string) {
    const [dexData, raydiumData] = await Promise.all([
      getDexScreenerTokenData(tokenAddress),
      getRaydiumTokenData()
    ]);

    const normalized = this.normalizeData(dexData, raydiumData, tokenAddress);
    return normalized;
  }

  private normalizeData(dexData: any, raydiumData: any, tokenAddress: string) {
    // Extract only the pair for this token
    const raydiumToken = raydiumData.find((p: { baseMint: string; }) => p.baseMint === tokenAddress);
    return {
      price: dexData?.pairs?.[0]?.priceUsd ?? raydiumToken?.price ?? null,
      volume24h: dexData?.pairs?.[0]?.volume?.h24 ?? raydiumToken?.volume24h ?? null,
      liquidity: dexData?.pairs?.[0]?.liquidity?.usd ?? raydiumToken?.liquidity ?? null,
      source: {
        dex: dexData?.pairs?.[0],
        raydium: raydiumToken
      }
    };
  }
}
