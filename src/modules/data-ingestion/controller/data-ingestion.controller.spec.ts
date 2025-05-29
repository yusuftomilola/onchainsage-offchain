import { Test, TestingModule } from '@nestjs/testing';
import { DataIngestionController } from '../data-ingestion.controller';
import { DataIngestionService } from '../data-ingestion.service';

describe('DataIngestionController', () => {
  let controller: DataIngestionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataIngestionController],
      providers: [DataIngestionService],
    }).compile();

    controller = module.get<DataIngestionController>(DataIngestionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
