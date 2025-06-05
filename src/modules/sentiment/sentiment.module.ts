import { Module } from '@nestjs/common';
import { SentimentService } from './sentiment.service';
import { SentimentController } from './sentiment.controller';
import { SentimentProcessor } from './sentiment.processor';

@Module({
  providers: [SentimentService, SentimentProcessor],
  controllers: [SentimentController],
  exports: [SentimentService],
})
export class SentimentModule {} 