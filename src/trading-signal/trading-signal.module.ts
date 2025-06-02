import { Module } from '@nestjs/common';
import { TradingSignalService } from './trading-signal.service';
import { TradingSignalController } from './trading-signal.controller';

@Module({
  controllers: [TradingSignalController],
  providers: [TradingSignalService],
})
export class TradingSignalModule {}
