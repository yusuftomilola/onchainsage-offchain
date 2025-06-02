import { Test, TestingModule } from '@nestjs/testing';
import { TradingSignalService } from './trading-signal.service';

describe('TradingSignalService', () => {
  let service: TradingSignalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TradingSignalService],
    }).compile();

    service = module.get<TradingSignalService>(TradingSignalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
