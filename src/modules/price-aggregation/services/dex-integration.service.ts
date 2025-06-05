import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { DexPrice } from '../interfaces/dex-price.interface';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceReliability } from '../entities/price-reliability.entity';

@Injectable()
export class DexIntegrationService {
  private readonly logger = new Logger(DexIntegrationService.name);
  private readonly apiKeys: Record<string, string> = {};

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(PriceReliability)
    private readonly reliabilityRepository: Repository<PriceReliability>,
  ) {
    // Load API keys from environment variables
    this.apiKeys = {
      'dexscreener': this.configService.get<string>('DEX_SCREENER_API_KEY'),
      '1inch': this.configService.get<string>('ONE_INCH_API_KEY'),
      'jupiter': this.configService.get<string>('JUPITER_API_KEY'),
    };
  }

  async getPriceFromJupiter(tokenAddress: string): Promise<DexPrice | null> {
    try {
      const startTime = Date.now();
      const url = `https://price.jup.ag/v4/price?ids=${tokenAddress}`;
      
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching price from Jupiter: ${error.message}`);
            this.updateReliabilityScore('jupiter', 'solana', false);
            throw error;
          }),
        ),
      );

      const responseTime = Date.now() - startTime;
      this.updateReliabilityScore('jupiter', 'solana', true, responseTime / 1000);

      if (!data.data?.[tokenAddress]) {
        return null;
      }

      return {
        tokenAddress,
        chainId: 'solana',
        dexName: 'jupiter',
        priceUsd: parseFloat(data.data[tokenAddress].price) || 0,
        volume24h: data.data[tokenAddress].volume24h || 0,
        liquidity: null, // Jupiter API doesn't provide liquidity directly
        lastUpdated: new Date(),
        reliabilityScore: 100,
        rawData: data.data[tokenAddress],
      };
    } catch (error: any) {
      this.logger.error(`Failed to get price from Jupiter for token ${tokenAddress}: ${error.message}`);
      return null;
    }
  }

  async getPriceFromOneInch(tokenAddress: string, chainId: string): Promise<DexPrice | null> {
    try {
      const startTime = Date.now();
      // Convert chainId to network ID that 1inch expects
      const networkId = this.getOneInchNetworkId(chainId);
      if (!networkId) {
        this.logger.warn(`Unsupported chain ID for 1inch: ${chainId}`);
        return null;
      }

      const url = `https://api.1inch.io/v5.0/${networkId}/quote`;
      const params = {
        fromTokenAddress: tokenAddress,
        toTokenAddress: this.getStablecoinAddress(chainId), // Usually USDC or similar
        amount: '1000000000000000000', // 1 token in wei (18 decimals)
      };
      
      const headers = {};
      if (this.apiKeys['1inch']) {
        headers['Authorization'] = `Bearer ${this.apiKeys['1inch']}`;
      }
      
      const { data } = await firstValueFrom(
        this.httpService.get(url, { params, headers }).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching price from 1inch: ${error.message}`);
            this.updateReliabilityScore('1inch', chainId, false);
            throw error;
          }),
        ),
      );

      const responseTime = Date.now() - startTime;
      this.updateReliabilityScore('1inch', chainId, true, responseTime / 1000);

      // Calculate price in USD
      const priceUsd = parseFloat(data.toTokenAmount) / 10**6; // Assuming USDC with 6 decimals
      
      return {
        tokenAddress,
        chainId,
        dexName: '1inch',
        priceUsd,
        feePercent: parseFloat(data.estimatedGas) / 100, // Convert gas to percentage fee
        lastUpdated: new Date(),
        reliabilityScore: 100,
        rawData: data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get price from 1inch for token ${tokenAddress} on chain ${chainId}: ${error.message}`);
      return null;
    }
  }

  async getPriceFromSushiSwap(tokenAddress: string, chainId: string): Promise<DexPrice | null> {
    try {
      const startTime = Date.now();
      const url = `https://api.sushi.com/api/v1/tokens/${tokenAddress}?chainId=${this.getSushiSwapChainId(chainId)}`;
      
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching price from SushiSwap: ${error.message}`);
            this.updateReliabilityScore('sushiswap', chainId, false);
            throw error;
          }),
        ),
      );

      const responseTime = Date.now() - startTime;
      this.updateReliabilityScore('sushiswap', chainId, true, responseTime / 1000);

      return {
        tokenAddress,
        chainId,
        dexName: 'sushiswap',
        priceUsd: parseFloat(data.price?.value) || 0,
        volume24h: parseFloat(data.volume24h?.value) || 0,
        liquidity: parseFloat(data.liquidity?.value) || 0,
        lastUpdated: new Date(),
        reliabilityScore: 100,
        rawData: data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get price from SushiSwap for token ${tokenAddress} on chain ${chainId}: ${error.message}`);
      return null;
    }
  }

  async getPriceFromRaydium(tokenAddress: string): Promise<DexPrice | null> {
    try {
      const startTime = Date.now();
      const url = 'https://api.raydium.io/pairs';
      
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching price from Raydium: ${error.message}`);
            this.updateReliabilityScore('raydium', 'solana', false);
            throw error;
          }),
        ),
      );

      const responseTime = Date.now() - startTime;
      this.updateReliabilityScore('raydium', 'solana', true, responseTime / 1000);

      // Find the pair for this token
      const pair = data.find((p: { baseMint: string }) => p.baseMint === tokenAddress);
      
      if (!pair) {
        return null;
      }

      return {
        tokenAddress,
        chainId: 'solana',
        dexName: 'raydium',
        priceUsd: parseFloat(pair.price) || 0,
        volume24h: parseFloat(pair.volume24h) || 0,
        liquidity: parseFloat(pair.liquidity) || 0,
        lastUpdated: new Date(),
        reliabilityScore: 100,
        rawData: pair,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get price from Raydium for token ${tokenAddress}: ${error.message}`);
      return null;
    }
  }

  async getPriceFromDexScreener(tokenAddress: string, chainId: string): Promise<DexPrice | null> {
    try {
      const startTime = Date.now();
      const url = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${tokenAddress}`;
      
      const headers = {};
      if (this.apiKeys['dexscreener']) {
        headers['X-API-KEY'] = this.apiKeys['dexscreener'];
      }
      
      const { data } = await firstValueFrom(
        this.httpService.get(url, { headers }).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching price from DexScreener: ${error.message}`);
            this.updateReliabilityScore('dexscreener', chainId, false);
            throw error;
          }),
        ),
      );

      const responseTime = Date.now() - startTime;
      this.updateReliabilityScore('dexscreener', chainId, true, responseTime / 1000);

      if (!data.pairs || data.pairs.length === 0) {
        return null;
      }

      const pair = data.pairs[0];
      
      return {
        tokenAddress,
        chainId,
        dexName: 'dexscreener',
        priceUsd: parseFloat(pair.priceUsd) || 0,
        volume24h: parseFloat(pair.volume?.h24) || 0,
        liquidity: parseFloat(pair.liquidity?.usd) || 0,
        lastUpdated: new Date(),
        reliabilityScore: 100,
        rawData: pair,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get price from DexScreener for token ${tokenAddress} on chain ${chainId}: ${error.message}`);
      return null;
    }
  }

  // Helper methods
  private getOneInchNetworkId(chainId: string): number | null {
    const networkMap: Record<string, number> = {
      'ethereum': 1,
      'bsc': 56,
      'polygon': 137,
      'optimism': 10,
      'arbitrum': 42161,
      'avalanche': 43114,
      'gnosis': 100,
      'fantom': 250,
      'base': 8453,
    };
    
    return networkMap[chainId] || null;
  }

  private getSushiSwapChainId(chainId: string): number | null {
    const networkMap: Record<string, number> = {
      'ethereum': 1,
      'arbitrum': 42161,
      'polygon': 137,
      'base': 8453,
      'optimism': 10,
      'avalanche': 43114,
    };
    
    return networkMap[chainId] || null;
  }

  private getStablecoinAddress(chainId: string): string {
    // Common USDC addresses across different chains
    const usdcAddresses: Record<string, string> = {
      'ethereum': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'polygon': '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      'arbitrum': '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
      'optimism': '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
      'bsc': '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      'avalanche': '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    };
    
    return usdcAddresses[chainId] || usdcAddresses['ethereum']; // Default to Ethereum USDC
  }

  private async updateReliabilityScore(
    dexName: string,
    chainId: string,
    success: boolean,
    responseTimeSeconds?: number,
  ): Promise<void> {
    try {
      let reliability = await this.reliabilityRepository.findOne({
        where: { dexName, chainId },
      });

      if (!reliability) {
        reliability = this.reliabilityRepository.create({
          dexName,
          chainId,
          reliabilityScore: 100,
          averageDelaySeconds: 0,
          priceDeviationPercent: 0,
          failureCount: 0,
          successCount: 0,
          metricHistory: {},
        });
      }

      if (success) {
        reliability.successCount += 1;
        if (responseTimeSeconds) {
          // Update average delay with exponential moving average
          reliability.averageDelaySeconds = 
            reliability.averageDelaySeconds * 0.9 + responseTimeSeconds * 0.1;
        }
      } else {
        reliability.failureCount += 1;
        // Decrease reliability score on failure
        reliability.reliabilityScore = Math.max(50, reliability.reliabilityScore - 5);
      }

      // Calculate reliability score based on success rate
      const totalCalls = reliability.successCount + reliability.failureCount;
      if (totalCalls > 10) {
        const successRate = reliability.successCount / totalCalls;
        reliability.reliabilityScore = Math.min(100, Math.round(successRate * 100));
      }

      // Adjust for response time
      if (responseTimeSeconds && responseTimeSeconds > 5) {
        // Penalize slow responses
        reliability.reliabilityScore = Math.max(50, reliability.reliabilityScore - 
          Math.min(10, Math.floor(responseTimeSeconds / 5)));
      }

      await this.reliabilityRepository.save(reliability);
    } catch (error: any) {
      this.logger.error(`Failed to update reliability score: ${error.message}`);
    }
  }
}
