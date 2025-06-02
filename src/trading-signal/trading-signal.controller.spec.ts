import { Test, TestingModule } from '@nestjs/testing';
import { TradingSignalController } from './trading-signal.controller';
import { TradingSignalService } from './trading-signal.service';

describe('TradingSignalController', () => {
  let controller: TradingSignalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradingSignalController],
      providers: [TradingSignalService],
    }).compile();

    controller = module.get<TradingSignalController>(TradingSignalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
