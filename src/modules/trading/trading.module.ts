import { Module } from '@nestjs/common';
import { TradingController } from './controllers/trading.controller';
import { TradingService } from './services/trading.service';

@Module({
  controllers: [TradingController],
  providers: [TradingService],
})
export class TradingModule {}
