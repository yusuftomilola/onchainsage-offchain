import { Module } from '@nestjs/common';
import { DataIngestionController } from './controller/data-ingestion.controller';
import { DataIngestionService } from './services/data-ingestion.service';

@Module({
  controllers: [DataIngestionController],
  providers: [DataIngestionService],
})
export class DataIngestionModule {}
