import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceData } from '../entities/price-data.entity';
import { DexIntegrationService } from './dex-integration.service';
import { BestPriceResult, DexPrice, TokenPriceMap } from '../interfaces/dex-price.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PriceAggregationService {
  private readonly logger = new Logger(PriceAggregationService.name);
  private readonly supportedDexes = ['jupiter', '1inch', 'sushiswap', 'raydium', 'dexscreener'];
  private readonly supportedChains = ['ethereum', 'solana', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche'];
  private readonly priceCache: TokenPriceMap = {};
  private readonly updateInterval = 30000; // 30 seconds in ms

  constructor(
    @InjectRepository(PriceData)
    private readonly priceRepository: Repository<PriceData>,
    private readonly dexIntegrationService: DexIntegrationService,
    private readonly configService: ConfigService,
    @InjectQueue('price-aggregation')
    private readonly priceQueue: Queue,
  ) {}

  /**
   * Fetches prices for a token from all supported DEXes
   */
  async getAllPrices(tokenAddress: string, chainId?: string, dexName?: string): Promise<DexPrice[]> {
    try {
      // Check if we have fresh data in cache
      const cachedPrices = this.getCachedPrices(tokenAddress, chainId, dexName);
      if (cachedPrices.length > 0) {
        return cachedPrices;
      }

      // If not in cache or cache is stale, fetch from database
      const dbPrices = await this.getPricesFromDb(tokenAddress, chainId, dexName);
      
      // If we have recent data in DB, use that and update cache
      const recentPrices = dbPrices.filter(price => 
        new Date().getTime() - new Date(price.updatedAt).getTime() < this.updateInterval
      );
      
      if (recentPrices.length > 0) {
        // Update cache with DB data
        recentPrices.forEach(price => this.updatePriceCache(price));
        return recentPrices;
      }

      // If no recent data, trigger a refresh but return what we have for now
      this.queuePriceUpdate(tokenAddress);
      
      return dbPrices.length > 0 ? dbPrices : await this.fetchPricesFromDexes(tokenAddress, chainId, dexName);
    } catch (error: any) {
      this.logger.error(`Error fetching all prices: ${error.message}`);
      return [];
    }
  }

  /**
   * Gets the best price for a token across all DEXes
   */
  async getBestPrice(tokenAddress: string, chainId?: string, dexName?: string, amountUsd?: number): Promise<BestPriceResult> {
    const prices = await this.getAllPrices(tokenAddress, chainId, dexName);
    
    if (prices.length === 0) {
      throw new Error(`No prices found for token ${tokenAddress}`);
    }

    // Filter out unreliable prices (below threshold)
    const reliableThreshold = 70; // Minimum reliability score
    const reliablePrices = prices.filter(price => price.reliabilityScore >= reliableThreshold);
    
    // If no reliable prices, use all prices but log a warning
    const pricesToUse = reliablePrices.length > 0 ? reliablePrices : prices;
    if (reliablePrices.length === 0) {
      this.logger.warn(`No reliable prices found for token ${tokenAddress}, using all available prices`);
    }

    // Sort by price and consider slippage if amount is provided
    let sortedPrices;
    if (amountUsd) {
      sortedPrices = this.sortByEffectivePrice(pricesToUse, amountUsd);
    } else {
      // Sort by raw price (best price first)
      sortedPrices = [...pricesToUse].sort((a, b) => b.priceUsd - a.priceUsd);
    }

    const bestPrice = sortedPrices[0];
    
    // Calculate price spread percentage
    const highestPrice = Math.max(...pricesToUse.map(p => p.priceUsd));
    const lowestPrice = Math.min(...pricesToUse.map(p => p.priceUsd));
    const priceSpreadPercent = highestPrice > 0 
      ? ((highestPrice - lowestPrice) / highestPrice) * 100 
      : 0;

    return {
      tokenAddress,
      bestPrice,
      allPrices: sortedPrices,
      priceSpreadPercent,
      recommendedDex: bestPrice.dexName,
      recommendedChain: bestPrice.chainId,
      updatedAt: new Date(),
    };
  }

  /**
   * Updates token prices in the database
   */
  async updatePrices(tokenAddress: string): Promise<void> {
    try {
      const prices = await this.fetchPricesFromDexes(tokenAddress);
      
      // Save to database
      for (const price of prices) {
        await this.savePriceToDb(price);
      }
      
      // Update cache
      prices.forEach(price => this.updatePriceCache(price));
      
      this.logger.log(`Updated prices for token ${tokenAddress} from ${prices.length} sources`);
    } catch (error: any) {
      this.logger.error(`Error updating prices: ${error.message}`);
    }
  }

  /**
   * Fetches real-time prices from all integrated DEXes
   */
  private async fetchPricesFromDexes(tokenAddress: string, chainId?: string, dexName?: string): Promise<DexPrice[]> {
    const prices: DexPrice[] = [];
    const tasks: Promise<DexPrice | null>[] = [];

    // Filter chains and DEXes based on parameters
    const chainsToQuery = chainId ? [chainId] : this.supportedChains;
    const dexesToQuery = dexName ? [dexName] : this.supportedDexes;

    // Jupiter (Solana only)
    if (dexesToQuery.includes('jupiter') && (!chainId || chainId === 'solana')) {
      tasks.push(this.dexIntegrationService.getPriceFromJupiter(tokenAddress));
    }

    // Raydium (Solana only)
    if (dexesToQuery.includes('raydium') && (!chainId || chainId === 'solana')) {
      tasks.push(this.dexIntegrationService.getPriceFromRaydium(tokenAddress));
    }

    // 1inch (multiple chains)
    if (dexesToQuery.includes('1inch')) {
      for (const chain of chainsToQuery.filter(c => c !== 'solana')) {
        tasks.push(this.dexIntegrationService.getPriceFromOneInch(tokenAddress, chain));
      }
    }

    // SushiSwap (multiple chains)
    if (dexesToQuery.includes('sushiswap')) {
      for (const chain of chainsToQuery.filter(c => c !== 'solana')) {
        tasks.push(this.dexIntegrationService.getPriceFromSushiSwap(tokenAddress, chain));
      }
    }

    // DexScreener (all chains)
    if (dexesToQuery.includes('dexscreener')) {
      for (const chain of chainsToQuery) {
        tasks.push(this.dexIntegrationService.getPriceFromDexScreener(tokenAddress, chain));
      }
    }

    // Wait for all price fetching tasks to complete
    const results = await Promise.all(tasks);
    
    // Filter out null results and add to prices array
    results.forEach(result => {
      if (result) {
        prices.push(result);
      }
    });

    return prices;
  }

  /**
   * Queues a price update job
   */
  private async queuePriceUpdate(tokenAddress: string): Promise<void> {
    await this.priceQueue.add('update-token-price', { tokenAddress }, {
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  }

  /**
   * Gets prices from the database
   */
  private async getPricesFromDb(tokenAddress: string, chainId?: string, dexName?: string): Promise<PriceData[]> {
    const query = this.priceRepository.createQueryBuilder('price')
      .where('price.tokenAddress = :tokenAddress', { tokenAddress })
      .andWhere('price.isActive = :isActive', { isActive: true });

    if (chainId) {
      query.andWhere('price.chainId = :chainId', { chainId });
    }

    if (dexName) {
      query.andWhere('price.dexName = :dexName', { dexName });
    }

    return query.orderBy('price.updatedAt', 'DESC').getMany();
  }

  /**
   * Saves price data to the database
   */
  private async savePriceToDb(price: DexPrice): Promise<void> {
    try {
      // Check if we already have this price in the database
      const existingPrice = await this.priceRepository.findOne({
        where: {
          tokenAddress: price.tokenAddress,
          chainId: price.chainId,
          dexName: price.dexName,
        },
      });

      if (existingPrice) {
        // Update existing record
        await this.priceRepository.update(existingPrice.id, {
          priceUsd: price.priceUsd,
          volume24h: price.volume24h,
          liquidity: price.liquidity,
          slippageFor1000Usd: price.slippageFor1000Usd,
          slippageFor10000Usd: price.slippageFor10000Usd,
          slippageFor100000Usd: price.slippageFor100000Usd,
          feePercent: price.feePercent,
          rawData: price.rawData,
          reliabilityScore: price.reliabilityScore,
          updatedAt: new Date(),
        });
      } else {
        // Create new record
        await this.priceRepository.save({
          tokenAddress: price.tokenAddress,
          chainId: price.chainId,
          dexName: price.dexName,
          priceUsd: price.priceUsd,
          volume24h: price.volume24h,
          liquidity: price.liquidity,
          slippageFor1000Usd: price.slippageFor1000Usd,
          slippageFor10000Usd: price.slippageFor10000Usd,
          slippageFor100000Usd: price.slippageFor100000Usd,
          feePercent: price.feePercent,
          rawData: price.rawData,
          reliabilityScore: price.reliabilityScore,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error: any) {
      this.logger.error(`Error saving price to database: ${error.message}`);
    }
  }

  /**
   * Updates the price cache with new data
   */
  private updatePriceCache(price: DexPrice | PriceData): void {
    const { tokenAddress, chainId, dexName } = price;
    
    if (!this.priceCache[tokenAddress]) {
      this.priceCache[tokenAddress] = {};
    }
    
    if (!this.priceCache[tokenAddress][chainId]) {
      this.priceCache[tokenAddress][chainId] = {};
    }
    
    this.priceCache[tokenAddress][chainId][dexName] = {
      ...price,
      lastUpdated: new Date(),
    };
  }

  /**
   * Gets prices from the cache
   */
  private getCachedPrices(tokenAddress: string, chainId?: string, dexName?: string): DexPrice[] {
    const result: DexPrice[] = [];
    const now = new Date().getTime();
    
    // No cache for this token
    if (!this.priceCache[tokenAddress]) {
      return result;
    }
    
    // Filter by chain if specified
    const chains = chainId 
      ? (this.priceCache[tokenAddress][chainId] ? [chainId] : [])
      : Object.keys(this.priceCache[tokenAddress]);
    
    for (const chain of chains) {
      // Filter by DEX if specified
      const dexes = dexName 
        ? (this.priceCache[tokenAddress][chain][dexName] ? [dexName] : [])
        : Object.keys(this.priceCache[tokenAddress][chain]);
      
      for (const dex of dexes) {
        const cachedPrice = this.priceCache[tokenAddress][chain][dex];
        
        // Check if cache is fresh (less than updateInterval ms old)
        if (cachedPrice && (now - new Date(cachedPrice.lastUpdated).getTime() < this.updateInterval)) {
          result.push(cachedPrice);
        }
      }
    }
    
    return result;
  }

  /**
   * Sorts prices by effective price considering slippage for a given amount
   */
  private sortByEffectivePrice(prices: DexPrice[], amountUsd: number): DexPrice[] {
    return [...prices].sort((a, b) => {
      // Calculate effective price considering slippage
      const slippageA = this.estimateSlippage(a, amountUsd);
      const slippageB = this.estimateSlippage(b, amountUsd);
      
      const effectivePriceA = a.priceUsd * (1 - slippageA / 100);
      const effectivePriceB = b.priceUsd * (1 - slippageB / 100);
      
      return effectivePriceB - effectivePriceA;
    });
  }

  /**
   * Estimates slippage for a given amount
   */
  private estimateSlippage(price: DexPrice, amountUsd: number): number {
    if (amountUsd <= 1000 && price.slippageFor1000Usd !== undefined) {
      return price.slippageFor1000Usd;
    } else if (amountUsd <= 10000 && price.slippageFor10000Usd !== undefined) {
      return price.slippageFor10000Usd;
    } else if (price.slippageFor100000Usd !== undefined) {
      return price.slippageFor100000Usd;
    }
    
    // If no slippage data, estimate based on liquidity
    if (price.liquidity) {
      // Simple model: slippage increases with amount and decreases with liquidity
      return Math.min(10, (amountUsd / price.liquidity) * 100);
    }
    
    // Default slippage if we can't calculate
    return 1;
  }

  /**
   * Scheduled job to refresh price data for active tokens
   */
  @Cron('*/30 * * * * *') // Run every 30 seconds
  async refreshActivePrices() {
    try {
      // Get list of tokens that have been queried in the last hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const activeTokens = await this.priceRepository
        .createQueryBuilder('price')
        .select('DISTINCT price.tokenAddress', 'tokenAddress')
        .where('price.updatedAt > :oneHourAgo', { oneHourAgo })
        .getRawMany();
      
      // Queue update jobs for each active token
      for (const { tokenAddress } of activeTokens) {
        await this.queuePriceUpdate(tokenAddress);
      }
    } catch (error: any) {
      this.logger.error(`Error refreshing active prices: ${error.message}`);
    }
  }
}
