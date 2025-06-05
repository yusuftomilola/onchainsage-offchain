export interface ArbitrageOpportunityDto {
  id?: string;
  tokenAddress: string;
  sourceChainId: string;
  sourceDexName: string;
  targetChainId: string;
  targetDexName: string;
  sourcePriceUsd: number;
  targetPriceUsd: number;
  profitPercent: number;
  estimatedFeePercent: number;
  netProfitPercent: number;
  routeDetails?: Record<string, any>;
  isCrossChain: boolean;
  isActive: boolean;
  detectedAt: Date;
}

export interface ArbitrageSearchParams {
  minProfitPercent?: number;
  isCrossChain?: boolean;
  tokenAddress?: string;
  chainId?: string;
  dexName?: string;
  limit?: number;
}

export interface CrossChainBridgeFee {
  sourceChainId: string;
  targetChainId: string;
  bridgeName: string;
  fixedFeeUsd: number;
  percentageFee: number;
  estimatedTimeSeconds: number;
  minAmount?: number;
  maxAmount?: number;
}
