import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from the cache.
   * @param key The cache key.
   * @returns The cached value, or undefined if not found.
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT for key: ${key}`);
      }
      return value === null ? undefined : value;
    } catch (error) {
      this.logger.error(`Error getting from cache for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set a value in the cache.
   * @param key The cache key.
   * @param value The value to cache.
   * @param ttlSeconds Optional: Time-to-live in seconds.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.cacheManager.set(key, value, ttlSeconds * 1000); // cache-manager uses milliseconds
      } else {
        await this.cacheManager.set(key, value);
      }
      this.logger.debug(`Cache SET for key: ${key} with TTL: ${ttlSeconds || 'default'}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from the cache.
   * @param key The cache key to delete.
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}:`, error);
    }
  }


}
