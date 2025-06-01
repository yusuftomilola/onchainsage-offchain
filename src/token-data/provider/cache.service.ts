import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class TokenDataCacheService {
     constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

     async getTokenData(tokenAddress: string) {
          const cached = await this.cacheManager.get(tokenAddress);
          if (cached) return cached;

          const data = await this.fetchAndNormalizeTokenData(tokenAddress);
          await this.cacheManager.set(tokenAddress, data, 60); // 1-minute TTL
          return data;
     }

     // You need to implement this method or import it from elsewhere
     private async fetchAndNormalizeTokenData(tokenAddress: string): Promise<any> {
          // Implementation goes here
          return {};
     }
}
