import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArbitrageOpportunity } from '../entities/arbitrage-opportunity.entity';
import { PriceAggregationService } from './price-aggregation.service';
import { BridgeService } from './bridge.service';
import { ArbitrageOpportunityDto, ArbitrageSearchParams, CrossChainBridgeFee } from '../interfaces/arbitrage.interface';
import { DexPrice } from '../interfaces/dex-price.interface';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ArbitrageService {
  private readonly logger = new Logger(ArbitrageService.name);
  private readonly minProfitThreshold = 2; // Minimum profit percentage to record

  constructor(
    @InjectRepository(ArbitrageOpportunity)
    private readonly arbitrageRepository: Repository<ArbitrageOpportunity>,
    private readonly priceAggregationService: PriceAggregationService,
    private readonly bridgeService: BridgeService,
  ) {}

  /**
   * Find arbitrage opportunities for a specific token
   */
  async findArbitrageOpportunities(
    tokenAddress: string,
    params: ArbitrageSearchParams = {},
  ): Promise<ArbitrageOpportunityDto[]> {
    try {
      // Get all prices for this token
      const prices = await this.priceAggregationService.getAllPrices(tokenAddress);
      
      if (prices.length < 2) {
        return [];
      }

      const opportunities: ArbitrageOpportunityDto[] = [];
      
      // Compare each price with every other price
      for (let i = 0; i < prices.length; i++) {
        for (let j = i + 1; j < prices.length; j++) {
          const sourcePrice = prices[i];
          const targetPrice = prices[j];
          
          // Skip if both prices are from same DEX and chain
          if (sourcePrice.dexName === targetPrice.dexName && 
              sourcePrice.chainId === targetPrice.chainId) {
            continue;
          }
          
          // Calculate profit percentage
          const isCrossChain = sourcePrice.chainId !== targetPrice.chainId;
          let profitPercent = 0;
          let estimatedFeePercent = 0;
          
          // Determine which price is higher
          if (sourcePrice.priceUsd > targetPrice.priceUsd) {
            profitPercent = ((sourcePrice.priceUsd - targetPrice.priceUsd) / targetPrice.priceUsd) * 100;
          } else {
            profitPercent = ((targetPrice.priceUsd - sourcePrice.priceUsd) / sourcePrice.priceUsd) * 100;
          }
          
          // If cross-chain, calculate bridge fees
          if (isCrossChain) {
            const bridgeFee = await this.bridgeService.getBridgeFee(
              sourcePrice.chainId, 
              targetPrice.chainId
            );
            estimatedFeePercent = bridgeFee?.percentageFee || 0.5;
            
            // Add DEX fees
            estimatedFeePercent += (sourcePrice.feePercent || 0.1) + (targetPrice.feePercent || 0.1);
          } else {
            // Same chain, just add DEX fees
            estimatedFeePercent = (sourcePrice.feePercent || 0.1) + (targetPrice.feePercent || 0.1);
          }
          
          // Calculate net profit
          const netProfitPercent = profitPercent - estimatedFeePercent;
          
          // Filter by minimum profit if specified
          const minProfit = params.minProfitPercent || this.minProfitThreshold;
          if (netProfitPercent < minProfit) {
            continue;
          }
          
          // Filter by cross-chain if specified
          if (params.isCrossChain !== undefined && params.isCrossChain !== isCrossChain) {
            continue;
          }
          
          // Create arbitrage opportunity
          const opportunity: ArbitrageOpportunityDto = {
            tokenAddress,
            sourceChainId: sourcePrice.chainId,
            sourceDexName: sourcePrice.dexName,
            targetChainId: targetPrice.chainId,
            targetDexName: targetPrice.dexName,
            sourcePriceUsd: sourcePrice.priceUsd,
            targetPriceUsd: targetPrice.priceUsd,
            profitPercent,
            estimatedFeePercent,
            netProfitPercent,
            isCrossChain,
            isActive: true,
            detectedAt: new Date(),
          };
          
          opportunities.push(opportunity);
        }
      }
      
      // Sort by net profit (highest first)
      opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);
      
      // Apply limit if specified
      if (params.limit && params.limit > 0) {
        return opportunities.slice(0, params.limit);
      }
      
      return opportunities;
    } catch (error: any) {
      this.logger.error(`Error finding arbitrage opportunities: ${error.message}`);
      return [];
    }
  }

  /**
   * Get active arbitrage opportunities from database
   */
  async getArbitrageOpportunities(params: ArbitrageSearchParams = {}): Promise<ArbitrageOpportunity[]> {
    try {
      const query = this.arbitrageRepository.createQueryBuilder('arb')
        .where('arb.isActive = :isActive', { isActive: true });
      
      if (params.minProfitPercent) {
        query.andWhere('arb.netProfitPercent >= :minProfit', { minProfit: params.minProfitPercent });
      }
      
      if (params.isCrossChain !== undefined) {
        query.andWhere('arb.isCrossChain = :isCrossChain', { isCrossChain: params.isCrossChain });
      }
      
      if (params.tokenAddress) {
        query.andWhere('arb.tokenAddress = :tokenAddress', { tokenAddress: params.tokenAddress });
      }
      
      if (params.chainId) {
        query.andWhere('(arb.sourceChainId = :chainId OR arb.targetChainId = :chainId)', { chainId: params.chainId });
      }
      
      if (params.dexName) {
        query.andWhere('(arb.sourceDexName = :dexName OR arb.targetDexName = :dexName)', { dexName: params.dexName });
      }
      
      query.orderBy('arb.netProfitPercent', 'DESC');
      
      if (params.limit) {
        query.limit(params.limit);
      }
      
      return query.getMany();
    } catch (error: any) {
      this.logger.error(`Error getting arbitrage opportunities: ${error.message}`);
      return [];
    }
  }

  /**
   * Save an arbitrage opportunity to the database
   */
  async saveArbitrageOpportunity(opportunity: ArbitrageOpportunityDto): Promise<ArbitrageOpportunity> {
    try {
      // Check if a similar opportunity already exists
      const existing = await this.arbitrageRepository.findOne({
        where: {
          tokenAddress: opportunity.tokenAddress,
          sourceChainId: opportunity.sourceChainId,
          sourceDexName: opportunity.sourceDexName,
          targetChainId: opportunity.targetChainId,
          targetDexName: opportunity.targetDexName,
          isActive: true,
        },
      });
      
      if (existing) {
        // Update existing opportunity
        existing.sourcePriceUsd = opportunity.sourcePriceUsd;
        existing.targetPriceUsd = opportunity.targetPriceUsd;
        existing.profitPercent = opportunity.profitPercent;
        existing.estimatedFeePercent = opportunity.estimatedFeePercent;
        existing.netProfitPercent = opportunity.netProfitPercent;
        existing.detectedAt = new Date();
        
        return this.arbitrageRepository.save(existing);
      } else {
        // Create new opportunity
        return this.arbitrageRepository.save(opportunity);
      }
    } catch (error: any) {
      this.logger.error(`Error saving arbitrage opportunity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark arbitrage opportunities as inactive if they no longer exist
   */
  async updateArbitrageStatus(tokenAddress: string): Promise<void> {
    try {
      // Get current prices
      const prices = await this.priceAggregationService.getAllPrices(tokenAddress);
      
      // Get active arbitrage opportunities for this token
      const activeOpportunities = await this.arbitrageRepository.find({
        where: {
          tokenAddress,
          isActive: true,
        },
      });
      
      // Create a map of available DEXes and chains
      const availableDexChains = new Map<string, boolean>();
      prices.forEach(price => {
        const key = `${price.dexName}-${price.chainId}`;
        availableDexChains.set(key, true);
      });
      
      // Check each opportunity
      for (const opportunity of activeOpportunities) {
        const sourceKey = `${opportunity.sourceDexName}-${opportunity.sourceChainId}`;
        const targetKey = `${opportunity.targetDexName}-${opportunity.targetChainId}`;
        
        // If either source or target is no longer available, mark as inactive
        if (!availableDexChains.has(sourceKey) || !availableDexChains.has(targetKey)) {
          opportunity.isActive = false;
          await this.arbitrageRepository.save(opportunity);
        } else {
          // Recalculate profit
          const sourcePrice = prices.find(p => 
            p.dexName === opportunity.sourceDexName && p.chainId === opportunity.sourceChainId
          );
          
          const targetPrice = prices.find(p => 
            p.dexName === opportunity.targetDexName && p.chainId === opportunity.targetChainId
          );
          
          if (sourcePrice && targetPrice) {
            let profitPercent = 0;
            
            if (sourcePrice.priceUsd > targetPrice.priceUsd) {
              profitPercent = ((sourcePrice.priceUsd - targetPrice.priceUsd) / targetPrice.priceUsd) * 100;
            } else {
              profitPercent = ((targetPrice.priceUsd - sourcePrice.priceUsd) / sourcePrice.priceUsd) * 100;
            }
            
            const netProfitPercent = profitPercent - opportunity.estimatedFeePercent;
            
            // If profit is below threshold, mark as inactive
            if (netProfitPercent < this.minProfitThreshold) {
              opportunity.isActive = false;
              await this.arbitrageRepository.save(opportunity);
            } else {
              // Update profit values
              opportunity.sourcePriceUsd = sourcePrice.priceUsd;
              opportunity.targetPriceUsd = targetPrice.priceUsd;
              opportunity.profitPercent = profitPercent;
              opportunity.netProfitPercent = netProfitPercent;
              opportunity.detectedAt = new Date();
              await this.arbitrageRepository.save(opportunity);
            }
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error updating arbitrage status: ${error.message}`);
    }
  }

  /**
   * Scan for arbitrage opportunities across all active tokens
   */
  @Cron('0 */1 * * * *') // Run every minute
  async scanForArbitrageOpportunities(): Promise<void> {
    try {
      // Get list of active tokens from price data
      const activeTokens = await this.getActiveTokens();
      
      for (const tokenAddress of activeTokens) {
        // Find opportunities for this token
        const opportunities = await this.findArbitrageOpportunities(tokenAddress);
        
        // Save opportunities to database
        for (const opportunity of opportunities) {
          await this.saveArbitrageOpportunity(opportunity);
        }
        
        // Update status of existing opportunities
        await this.updateArbitrageStatus(tokenAddress);
      }
      
      this.logger.log(`Completed arbitrage scan for ${activeTokens.length} tokens`);
    } catch (error: any) {
      this.logger.error(`Error scanning for arbitrage opportunities: ${error.message}`);
    }
  }

  /**
   * Get list of active tokens
   */
  private async getActiveTokens(): Promise<string[]> {
    try {
      const result = await this.arbitrageRepository
        .createQueryBuilder('arb')
        .select('DISTINCT arb.tokenAddress', 'tokenAddress')
        .where('arb.isActive = :isActive', { isActive: true })
        .getRawMany();
      
      return result.map(item => item.tokenAddress);
    } catch (error: any) {
      this.logger.error(`Error getting active tokens: ${error.message}`);
      return [];
    }
  }
}
