/**
 * Interface for price impact calculation results
 */
export interface PriceImpactResult {
  priceImpactPercent: number;
  effectivePrice: number;
  liquidityScore: number;
}

/**
 * Interface for historical price analytics
 */
export interface HistoricalAnalytics {
  tokenAddress: string;
  timeframe: string;
  averageSpreadPercent: number;
  maxSpreadPercent: number;
  arbitrageFrequency: number;
  volatilityScore: number;
  bestPerformingDex: string;
  worstPerformingDex: string;
}

/**
 * Interface for liquidity depth analysis
 */
export interface LiquidityDepthAnalysis {
  byChain: LiquidityDistribution[];
  byDex: LiquidityDistribution[];
  totalLiquidity: number;
  impactEstimates: {
    for1000Usd: number;
    for10000Usd: number;
    for100000Usd: number;
  };
}

/**
 * Interface for liquidity distribution
 */
export interface LiquidityDistribution {
  chain?: string;
  dex?: string;
  liquidity: number;
  percentage: number;
}
