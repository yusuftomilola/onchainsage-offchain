import { Module } from '@nestjs/common';
import { AiProcessingController } from './controllers/ai-processing.controller';
import { AiProcessingService } from './services/ai-processing.service';

@Module({
  controllers: [AiProcessingController],
  providers: [AiProcessingService],
})
export class AiProcessingModule {}
