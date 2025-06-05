export interface DexPrice {
  tokenAddress: string;
  chainId: string;
  dexName: string;
  priceUsd: number;
  volume24h?: number;
  liquidity?: number;
  slippageFor1000Usd?: number;
  slippageFor10000Usd?: number;
  slippageFor100000Usd?: number;
  feePercent?: number;
  lastUpdated: Date;
  reliabilityScore: number;
  rawData?: Record<string, any>;
}

export interface TokenPriceMap {
  [tokenAddress: string]: {
    [chainId: string]: {
      [dexName: string]: DexPrice;
    };
  };
}

export interface BestPriceResult {
  tokenAddress: string;
  bestPrice: DexPrice;
  allPrices: DexPrice[];
  priceSpreadPercent: number;
  recommendedDex: string;
  recommendedChain: string;
  updatedAt: Date;
}
