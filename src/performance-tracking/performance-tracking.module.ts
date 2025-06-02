import { Module } from '@nestjs/common';
import { PerformanceTrackingService } from './performance-tracking.service';
import { PerformanceTrackingController } from './performance-tracking.controller';

@Module({
  controllers: [PerformanceTrackingController],
  providers: [PerformanceTrackingService],
})
export class PerformanceTrackingModule {}
