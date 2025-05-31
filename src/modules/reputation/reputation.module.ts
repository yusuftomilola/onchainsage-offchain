import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReputationService } from './reputation.service';
import { ReputationController } from './reputation.controller';
import { TradingCall } from './entities/trading-call.entity';
import { Reputation } from './entities/reputation.entity';
import { ReputationHistory } from './entities/reputation-history.entity';
import { Badge } from './entities/badge.entity';
import { ReputationCronService } from './reputation-cron.service';

@Module({
  imports: [TypeOrmModule.forFeature([TradingCall, Reputation, ReputationHistory, Badge])],
  controllers: [ReputationController],
  providers: [ReputationService, ReputationCronService],
})
export class ReputationModule {}
