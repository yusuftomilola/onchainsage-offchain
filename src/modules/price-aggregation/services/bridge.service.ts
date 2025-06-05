import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { CrossChainBridgeFee } from '../interfaces/arbitrage.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BridgeService {
  private readonly logger = new Logger(BridgeService.name);
  private readonly bridgeFees: Map<string, CrossChainBridgeFee> = new Map();
  private readonly apiKeys: Record<string, string | undefined> = {};

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Load API keys from environment variables
    this.apiKeys = {
      'axelar': this.configService.get<string>('AXELAR_API_KEY'),
      'wormhole': this.configService.get<string>('WORMHOLE_API_KEY'),
      'stargate': this.configService.get<string>('STARGATE_API_KEY'),
    };

    // Initialize bridge fees with default values
    this.initializeBridgeFees();
  }

  /**
   * Get bridge fee for transferring between chains
   */
  async getBridgeFee(sourceChainId: string, targetChainId: string): Promise<CrossChainBridgeFee | null> {
    const key = `${sourceChainId}-${targetChainId}`;
    
    // Check if we have the fee in our cache
    if (this.bridgeFees.has(key)) {
      return this.bridgeFees.get(key) || null;
    }

    // If not in cache, try to fetch from API
    try {
      const fee = await this.fetchBridgeFee(sourceChainId, targetChainId);
      if (fee) {
        this.bridgeFees.set(key, fee);
        return fee;
      }
    } catch (error: any) {
      this.logger.error(`Error fetching bridge fee: ${error.message}`);
    }

    // If all else fails, return a default fee
    return this.getDefaultBridgeFee(sourceChainId, targetChainId);
  }

  /**
   * Fetch bridge fee from API
   */
  private async fetchBridgeFee(sourceChainId: string, targetChainId: string): Promise<CrossChainBridgeFee | null> {
    // Try Axelar API first
    try {
      const axelarFee = await this.fetchAxelarBridgeFee(sourceChainId, targetChainId);
      if (axelarFee) {
        return axelarFee;
      }
    } catch (error: any) {
      this.logger.debug(`Axelar API error: ${error.message}`);
    }

    // Try Wormhole API
    try {
      const wormholeFee = await this.fetchWormholeBridgeFee(sourceChainId, targetChainId);
      if (wormholeFee) {
        return wormholeFee;
      }
    } catch (error: any) {
      this.logger.debug(`Wormhole API error: ${error.message}`);
    }

    // Try Stargate API
    try {
      const stargateFee = await this.fetchStargateBridgeFee(sourceChainId, targetChainId);
      if (stargateFee) {
        return stargateFee;
      }
    } catch (error: any) {
      this.logger.debug(`Stargate API error: ${error.message}`);
    }

    return null;
  }

  /**
   * Fetch bridge fee from Axelar API
   */
  private async fetchAxelarBridgeFee(sourceChainId: string, targetChainId: string): Promise<CrossChainBridgeFee | null> {
    // Convert chain IDs to Axelar format
    const axelarSourceChain = this.getAxelarChainName(sourceChainId);
    const axelarTargetChain = this.getAxelarChainName(targetChainId);
    
    if (!axelarSourceChain || !axelarTargetChain) {
      return null;
    }

    try {
      const url = `https://api.axelar.network/v1/transactions/fee`;
      const params = {
        sourceChain: axelarSourceChain,
        destinationChain: axelarTargetChain,
        asset: 'uusdc', // Using USDC as reference
      };

      const headers: Record<string, string> = {};
      if (this.apiKeys['axelar']) {
        headers['X-API-KEY'] = this.apiKeys['axelar'];
      }

      const { data } = await firstValueFrom(
        this.httpService.get(url, { params, headers }).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching Axelar bridge fee: ${error.message}`);
            throw error;
          }),
        ),
      );

      return {
        sourceChainId,
        targetChainId,
        bridgeName: 'axelar',
        fixedFeeUsd: data.fee.amount / 1000000, // Convert from micro USDC to USD
        percentageFee: 0.1, // Axelar typically charges around 0.1%
        estimatedTimeSeconds: 300, // ~5 minutes
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Axelar bridge fee: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch bridge fee from Wormhole API
   */
  private async fetchWormholeBridgeFee(sourceChainId: string, targetChainId: string): Promise<CrossChainBridgeFee | null> {
    // Convert chain IDs to Wormhole format
    const wormholeSourceChain = this.getWormholeChainId(sourceChainId);
    const wormholeTargetChain = this.getWormholeChainId(targetChainId);
    
    if (!wormholeSourceChain || !wormholeTargetChain) {
      return null;
    }

    try {
      // Note: This is a simplified example as Wormhole doesn't have a direct fee API
      // In a real implementation, you would need to use their SDK or estimate gas costs
      
      // For now, return estimated values based on historical data
      return {
        sourceChainId,
        targetChainId,
        bridgeName: 'wormhole',
        fixedFeeUsd: 2.5, // Estimated fixed fee in USD
        percentageFee: 0.15, // Estimated percentage fee
        estimatedTimeSeconds: 600, // ~10 minutes
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Wormhole bridge fee: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch bridge fee from Stargate API
   */
  private async fetchStargateBridgeFee(sourceChainId: string, targetChainId: string): Promise<CrossChainBridgeFee | null> {
    // Convert chain IDs to Stargate format
    const stargateSourceChain = this.getStargateChainId(sourceChainId);
    const stargateTargetChain = this.getStargateChainId(targetChainId);
    
    if (!stargateSourceChain || !stargateTargetChain) {
      return null;
    }

    try {
      // Note: This is a simplified example as Stargate doesn't have a direct fee API
      // In a real implementation, you would need to use their SDK or estimate gas costs
      
      // For now, return estimated values based on historical data
      return {
        sourceChainId,
        targetChainId,
        bridgeName: 'stargate',
        fixedFeeUsd: 3.0, // Estimated fixed fee in USD
        percentageFee: 0.2, // Estimated percentage fee
        estimatedTimeSeconds: 180, // ~3 minutes
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Stargate bridge fee: ${error.message}`);
      return null;
    }
  }

  /**
   * Get default bridge fee for a chain pair
   */
  private getDefaultBridgeFee(sourceChainId: string, targetChainId: string): CrossChainBridgeFee {
    // Special case for Solana to EVM chains
    if (sourceChainId === 'solana' || targetChainId === 'solana') {
      return {
        sourceChainId,
        targetChainId,
        bridgeName: 'wormhole', // Wormhole is commonly used for Solana
        fixedFeeUsd: 3.0,
        percentageFee: 0.2,
        estimatedTimeSeconds: 600, // ~10 minutes
      };
    }

    // Default for EVM to EVM chains
    return {
      sourceChainId,
      targetChainId,
      bridgeName: 'axelar', // Axelar is a good default for EVM chains
      fixedFeeUsd: 2.0,
      percentageFee: 0.15,
      estimatedTimeSeconds: 300, // ~5 minutes
    };
  }

  /**
   * Initialize bridge fees with default values
   */
  private initializeBridgeFees(): void {
    const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana', 'bsc', 'avalanche'];
    
    for (const source of chains) {
      for (const target of chains) {
        if (source !== target) {
          const key = `${source}-${target}`;
          this.bridgeFees.set(key, this.getDefaultBridgeFee(source, target));
        }
      }
    }
  }

  /**
   * Convert chain ID to Axelar chain name
   */
  private getAxelarChainName(chainId: string): string | null {
    const chainMap: Record<string, string> = {
      'ethereum': 'ethereum',
      'polygon': 'polygon',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'bsc': 'binance',
      'avalanche': 'avalanche',
      'fantom': 'fantom',
    };
    
    return chainMap[chainId] || null;
  }

  /**
   * Convert chain ID to Wormhole chain ID
   */
  private getWormholeChainId(chainId: string): number | null {
    const chainMap: Record<string, number> = {
      'solana': 1,
      'ethereum': 2,
      'bsc': 4,
      'polygon': 5,
      'avalanche': 6,
      'arbitrum': 23,
      'optimism': 24,
    };
    
    return chainMap[chainId] || null;
  }

  /**
   * Convert chain ID to Stargate chain ID
   */
  private getStargateChainId(chainId: string): number | null {
    const chainMap: Record<string, number> = {
      'ethereum': 101,
      'bsc': 102,
      'avalanche': 106,
      'polygon': 109,
      'arbitrum': 110,
      'optimism': 111,
    };
    
    return chainMap[chainId] || null;
  }
}
