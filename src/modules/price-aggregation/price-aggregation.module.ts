import { Module } from '@nestjs/common';
import { PriceAggregationService } from './services/price-aggregation.service';
import { PriceAggregationController } from './controllers/price-aggregation.controller';
import { HttpModule } from '@nestjs/axios';
import { DexIntegrationService } from './services/dex-integration.service';
import { ArbitrageService } from './services/arbitrage.service';
import { BridgeService } from './services/bridge.service';
import { PriceAnalyticsService } from './services/price-analytics.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceData } from './entities/price-data.entity';
import { ArbitrageOpportunity } from './entities/arbitrage-opportunity.entity';
import { PriceReliability } from './entities/price-reliability.entity';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      PriceData,
      ArbitrageOpportunity,
      PriceReliability
    ]),
    BullModule.registerQueue({
      name: 'price-aggregation',
    }),
  ],
  controllers: [PriceAggregationController],
  providers: [
    PriceAggregationService,
    DexIntegrationService,
    ArbitrageService,
    BridgeService,
    PriceAnalyticsService,
  ],
  exports: [PriceAggregationService],
})
export class PriceAggregationModule {}
