import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TradingSignalService } from './trading-signal.service';
import { CreateTradingSignalDto } from './dto/create-trading-signal.dto';
import { UpdateTradingSignalDto } from './dto/update-trading-signal.dto';

@Controller('trading-signal')
export class TradingSignalController {
  constructor(private readonly tradingSignalService: TradingSignalService) {}

  @Post()
  create(@Body() createTradingSignalDto: CreateTradingSignalDto) {
    return this.tradingSignalService.create(createTradingSignalDto);
  }

  @Get()
  findAll() {
    return this.tradingSignalService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tradingSignalService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTradingSignalDto: UpdateTradingSignalDto) {
    return this.tradingSignalService.update(+id, updateTradingSignalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tradingSignalService.remove(+id);
  }
}
