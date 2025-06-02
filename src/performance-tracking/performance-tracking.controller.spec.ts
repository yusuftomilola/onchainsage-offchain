import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceTrackingController } from './performance-tracking.controller';
import { PerformanceTrackingService } from './performance-tracking.service';

describe('PerformanceTrackingController', () => {
  let controller: PerformanceTrackingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerformanceTrackingController],
      providers: [PerformanceTrackingService],
    }).compile();

    controller = module.get<PerformanceTrackingController>(PerformanceTrackingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
