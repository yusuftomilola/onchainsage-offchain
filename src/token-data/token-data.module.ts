import { Module } from '@nestjs/common';
import { TokenDataService } from './provider/token-data.service';
import { TokenDataController } from './token-data.controller';

@Module({
  controllers: [TokenDataController],
  providers: [TokenDataService],
})
export class TokenDataModule {}
