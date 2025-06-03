import { Module } from '@nestjs/common';
import { SentimentService } from './sentiment.service';
import { SentimentController } from './sentiment.controller';
import { SentimentProcessor } from './sentiment.processor';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'sentiment-analysis',
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: 3600, // 1 hour cache
        max: 1000, // maximum number of items in cache
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SentimentController],
  providers: [SentimentService, SentimentProcessor],
  exports: [SentimentService],
})
export class SentimentModule {} 