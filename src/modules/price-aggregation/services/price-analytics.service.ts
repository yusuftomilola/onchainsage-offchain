import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PriceData } from '../entities/price-data.entity';
import { ArbitrageOpportunity } from '../entities/arbitrage-opportunity.entity';
import { PriceImpactResult, HistoricalAnalytics, LiquidityDepthAnalysis } from '../interfaces/price-analytics.interface';

@Injectable()
export class PriceAnalyticsService {
  private readonly logger = new Logger(PriceAnalyticsService.name);

  constructor(
    @InjectRepository(PriceData)
    private readonly priceRepository: Repository<PriceData>,
    @InjectRepository(ArbitrageOpportunity)
    private readonly arbitrageRepository: Repository<ArbitrageOpportunity>,
  ) {}

  /**
   * Calculate price impact for a large trade
   */
  async calculatePriceImpact(
    tokenAddress: string,
    chainId: string,
    dexName: string,
    amountUsd: number,
  ): Promise<PriceImpactResult> {
    try {
      // Get current price data
      const priceData = await this.priceRepository.findOne({
        where: {
          tokenAddress,
          chainId,
          dexName,
          isActive: true,
        },
      });

      if (!priceData) {
        throw new Error(`No price data found for token ${tokenAddress} on ${chainId}:${dexName}`);
      }

      // Calculate price impact based on liquidity
      let priceImpactPercent = 0;
      let liquidityScore = 0;

      if (priceData.liquidity) {
        // Simple model: impact increases with amount and decreases with liquidity
        priceImpactPercent = Math.min(20, (amountUsd / priceData.liquidity) * 100);
        
        // Liquidity score from 0-100
        liquidityScore = Math.min(100, Math.round((priceData.liquidity / amountUsd) * 10));
      } else {
        // Fallback if liquidity data is not available
        priceImpactPercent = this.estimatePriceImpact(amountUsd, dexName);
        liquidityScore = 50; // Default medium score
      }

      // Calculate effective price after impact
      const effectivePrice = priceData.priceUsd * (1 - priceImpactPercent / 100);

      return {
        priceImpactPercent,
        effectivePrice,
        liquidityScore,
      };
    } catch (error: any) {
      this.logger.error(`Error calculating price impact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze liquidity depth across venues
   */
  async analyzeLiquidityDepth(tokenAddress: string): Promise<LiquidityDepthAnalysis> {
    try {
      // Get all price data for this token
      const priceData = await this.priceRepository.find({
        where: {
          tokenAddress,
          isActive: true,
        },
      });

      if (priceData.length === 0) {
        throw new Error(`No price data found for token ${tokenAddress}`);
      }

      // Group by chain and dex
      const liquidityByChain: Record<string, number> = {};
      const liquidityByDex: Record<string, number> = {};
      let totalLiquidity = 0;

      priceData.forEach(price => {
        if (price.liquidity) {
          // Add to chain total
          liquidityByChain[price.chainId] = (liquidityByChain[price.chainId] || 0) + price.liquidity;
          
          // Add to dex total
          liquidityByDex[price.dexName] = (liquidityByDex[price.dexName] || 0) + price.liquidity;
          
          // Add to total
          totalLiquidity += price.liquidity;
        }
      });

      // Calculate percentages
      const liquidityDistribution = {
        byChain: Object.entries(liquidityByChain).map(([chain, liquidity]) => ({
          chain,
          liquidity,
          percentage: (liquidity / totalLiquidity) * 100,
        })),
        byDex: Object.entries(liquidityByDex).map(([dex, liquidity]) => ({
          dex,
          liquidity,
          percentage: (liquidity / totalLiquidity) * 100,
        })),
        totalLiquidity,
        impactEstimates: {
          for1000Usd: this.estimateAverageImpact(priceData, 1000),
          for10000Usd: this.estimateAverageImpact(priceData, 10000),
          for100000Usd: this.estimateAverageImpact(priceData, 100000),
        },
      };

      return liquidityDistribution;
    } catch (error: any) {
      this.logger.error(`Error analyzing liquidity depth: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get historical spread and arbitrage analytics
   */
  async getHistoricalAnalytics(tokenAddress: string, timeframe: string): Promise<HistoricalAnalytics> {
    try {
      // Define time range based on timeframe
      const endDate = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 1); // Default to 24h
      }

      // Get arbitrage opportunities in this timeframe
      const arbitrageOpportunities = await this.arbitrageRepository.find({
        where: {
          tokenAddress,
          detectedAt: Between(startDate, endDate),
        },
      });

      // Calculate arbitrage frequency (opportunities per day)
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const arbitrageFrequency = arbitrageOpportunities.length / Math.max(1, daysDiff);

      // Get price data for spread analysis
      const priceData = await this.priceRepository.find({
        where: {
          tokenAddress,
          updatedAt: Between(startDate, endDate),
        },
      });

      // Calculate average and max spread
      let totalSpread = 0;
      let maxSpread = 0;
      const dexPerformance: Record<string, { count: number, totalProfit: number }> = {};

      // Group price data by timestamp (rounded to hour)
      const pricesByHour: Record<string, PriceData[]> = {};
      
      priceData.forEach(price => {
        const hourKey = new Date(price.updatedAt).setMinutes(0, 0, 0).toString();
        if (!pricesByHour[hourKey]) {
          pricesByHour[hourKey] = [];
        }
        pricesByHour[hourKey].push(price);
      });

      // Calculate spreads for each hour
      Object.values(pricesByHour).forEach(hourPrices => {
        if (hourPrices.length >= 2) {
          const maxPrice = Math.max(...hourPrices.map(p => p.priceUsd));
          const minPrice = Math.min(...hourPrices.map(p => p.priceUsd));
          const spread = maxPrice > 0 ? ((maxPrice - minPrice) / maxPrice) * 100 : 0;
          
          totalSpread += spread;
          maxSpread = Math.max(maxSpread, spread);
          
          // Track DEX performance
          hourPrices.forEach(price => {
            if (!dexPerformance[price.dexName]) {
              dexPerformance[price.dexName] = { count: 0, totalProfit: 0 };
            }
            dexPerformance[price.dexName].count++;
            
            // Higher price is better for selling, so consider it better performance
            const performance = (price.priceUsd - minPrice) / minPrice * 100;
            dexPerformance[price.dexName].totalProfit += performance;
          });
        }
      });

      const hourCount = Object.keys(pricesByHour).length;
      const averageSpreadPercent = hourCount > 0 ? totalSpread / hourCount : 0;

      // Calculate volatility score (0-100)
      const volatilityScore = Math.min(100, Math.round(averageSpreadPercent * 10));

      // Find best and worst performing DEXes
      let bestPerformingDex = '';
      let worstPerformingDex = '';
      let bestPerformance = -1;
      let worstPerformance = Number.MAX_VALUE;

      Object.entries(dexPerformance).forEach(([dex, performance]) => {
        const avgPerformance = performance.count > 0 ? performance.totalProfit / performance.count : 0;
        
        if (avgPerformance > bestPerformance) {
          bestPerformance = avgPerformance;
          bestPerformingDex = dex;
        }
        
        if (avgPerformance < worstPerformance) {
          worstPerformance = avgPerformance;
          worstPerformingDex = dex;
        }
      });

      return {
        tokenAddress,
        timeframe,
        averageSpreadPercent,
        maxSpreadPercent: maxSpread,
        arbitrageFrequency,
        volatilityScore,
        bestPerformingDex,
        worstPerformingDex,
      };
    } catch (error: any) {
      this.logger.error(`Error getting historical analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estimate price impact based on amount and DEX
   */
  private estimatePriceImpact(amountUsd: number, dexName: string): number {
    // Default impact estimates based on DEX and amount
    const impactEstimates: Record<string, Record<string, number>> = {
      'jupiter': {
        'low': 0.1,    // < $1,000
        'medium': 0.3, // $1,000 - $10,000
        'high': 1.0,   // $10,000 - $100,000
        'whale': 3.0,  // > $100,000
      },
      'raydium': {
        'low': 0.2,
        'medium': 0.5,
        'high': 1.5,
        'whale': 4.0,
      },
      '1inch': {
        'low': 0.1,
        'medium': 0.2,
        'high': 0.8,
        'whale': 2.5,
      },
      'sushiswap': {
        'low': 0.2,
        'medium': 0.6,
        'high': 1.8,
        'whale': 5.0,
      },
      'dexscreener': {
        'low': 0.15,
        'medium': 0.4,
        'high': 1.2,
        'whale': 3.5,
      },
    };

    // Default to average if DEX not found
    const dexImpacts = impactEstimates[dexName] || {
      'low': 0.15,
      'medium': 0.4,
      'high': 1.2,
      'whale': 3.5,
    };

    // Determine impact category based on amount
    let category = 'low';
    if (amountUsd > 100000) {
      category = 'whale';
    } else if (amountUsd > 10000) {
      category = 'high';
    } else if (amountUsd > 1000) {
      category = 'medium';
    }

    return dexImpacts[category];
  }

  /**
   * Estimate average impact across all venues
   */
  private estimateAverageImpact(priceData: PriceData[], amountUsd: number): number {
    let totalImpact = 0;
    let count = 0;

    priceData.forEach(price => {
      let impact = 0;
      
      // Use stored slippage if available
      if (amountUsd <= 1000 && price.slippageFor1000Usd !== null) {
        impact = price.slippageFor1000Usd;
      } else if (amountUsd <= 10000 && price.slippageFor10000Usd !== null) {
        impact = price.slippageFor10000Usd;
      } else if (price.slippageFor100000Usd !== null) {
        impact = price.slippageFor100000Usd;
      } else if (price.liquidity) {
        // Calculate based on liquidity
        impact = Math.min(20, (amountUsd / price.liquidity) * 100);
      } else {
        // Use estimate
        impact = this.estimatePriceImpact(amountUsd, price.dexName);
      }
      
      totalImpact += impact;
      count++;
    });

    return count > 0 ? totalImpact / count : 0;
  }
}
