import { Injectable } from '@nestjs/common';
import { CreateTradingSignalDto } from './dto/create-trading-signal.dto';
import { UpdateTradingSignalDto } from './dto/update-trading-signal.dto';

@Injectable()
export class TradingSignalService {
  create(createTradingSignalDto: CreateTradingSignalDto) {
    return 'This action adds a new tradingSignal';
  }

  findAll() {
    return `This action returns all tradingSignal`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tradingSignal`;
  }

  update(id: number, updateTradingSignalDto: UpdateTradingSignalDto) {
    return `This action updates a #${id} tradingSignal`;
  }

  remove(id: number) {
    return `This action removes a #${id} tradingSignal`;
  }
}
