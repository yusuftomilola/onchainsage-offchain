import { Module } from '@nestjs/common';
import { RiskController } from './controllers/risk.controller';
import { RiskMonitorService } from './services/risk-monitor.service';
import { ExposureControlService } from './services/exposure-control.service';
import { PositionReductionService } from './services/position-reduction.service';
import { PortfolioAnalysisService } from './services/portfolio-analysis.service';
import { StressTestingService } from './services/stress-testing.service';

@Module({
  controllers: [RiskController],
  providers: [
    RiskMonitorService,
    ExposureControlService,
    PositionReductionService,
    PortfolioAnalysisService,
    StressTestingService
  ],
  exports: [RiskMonitorService]
})
export class RiskManagementModule {}
