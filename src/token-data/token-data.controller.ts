import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TokenDataService } from './provider/token-data.service';


@Controller('token-data')
export class TokenDataController {
  constructor(private readonly tokenDataService: TokenDataService) {}

  @Post('fetch/:tokenAddress')
@Get(':tokenAddress')
async getTokenData(@Param('tokenAddress') tokenAddress: string) {
  return this.tokenDataService.fetchAndNormalizeTokenData(tokenAddress);
}

  @Get()
  findAll() {
    return this.tokenDataService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tokenDataService.findOne(+id);
  }

  
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tokenDataService.remove(+id);
  }
}
