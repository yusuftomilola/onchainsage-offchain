import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceTrackingService } from './performance-tracking.service';

describe('PerformanceTrackingService', () => {
  let service: PerformanceTrackingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceTrackingService],
    }).compile();

    service = module.get<PerformanceTrackingService>(PerformanceTrackingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
