import { Controller, Get, Query, Param, Post, Body, UseGuards } from '@nestjs/common';
import { PriceAggregationService } from '../services/price-aggregation.service';
import { ArbitrageService } from '../services/arbitrage.service';
import { PriceAnalyticsService } from '../services/price-analytics.service';
import { TokenPriceQueryDto, BestPriceQueryDto } from '../dto/token-price.dto';
import { ArbitrageSearchDto, ArbitrageResponseDto } from '../dto/arbitrage.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PriceImpactResult, HistoricalAnalytics, LiquidityDepthAnalysis } from '../interfaces/price-analytics.interface';

@ApiTags('price-aggregation')
@Controller('price-aggregation')
export class PriceAggregationController {
  constructor(
    private readonly priceAggregationService: PriceAggregationService,
    private readonly arbitrageService: ArbitrageService,
    private readonly priceAnalyticsService: PriceAnalyticsService,
  ) {}

  @Get('prices/:tokenAddress')
  @ApiOperation({ summary: 'Get all prices for a token across DEXs and chains' })
  @ApiResponse({ status: 200, description: 'Returns all prices for the token' })
  async getAllPrices(
    @Param('tokenAddress') tokenAddress: string,
    @Query() query: TokenPriceQueryDto,
  ) {
    return this.priceAggregationService.getAllPrices(
      tokenAddress,
      query.chainId,
      query.dexName,
    );
  }

  @Get('best-price/:tokenAddress')
  @ApiOperation({ summary: 'Get best execution price for a token' })
  @ApiResponse({ status: 200, description: 'Returns the best price and execution venue' })
  async getBestPrice(
    @Param('tokenAddress') tokenAddress: string,
    @Query() query: BestPriceQueryDto,
  ) {
    const amountUsd = query.amountUsd ? parseFloat(query.amountUsd) : undefined;
    return this.priceAggregationService.getBestPrice(
      tokenAddress,
      query.chainId,
      query.dexName,
      amountUsd,
    );
  }

  @Get('arbitrage/:tokenAddress')
  @ApiOperation({ summary: 'Find arbitrage opportunities for a token' })
  @ApiResponse({ status: 200, description: 'Returns arbitrage opportunities' })
  async findArbitrageOpportunities(
    @Param('tokenAddress') tokenAddress: string,
    @Query() query: ArbitrageSearchDto,
  ) {
    return this.arbitrageService.findArbitrageOpportunities(tokenAddress, query);
  }

  @Get('arbitrage')
  @ApiOperation({ summary: 'Get all active arbitrage opportunities' })
  @ApiResponse({ status: 200, description: 'Returns all active arbitrage opportunities' })
  async getArbitrageOpportunities(@Query() query: ArbitrageSearchDto) {
    return this.arbitrageService.getArbitrageOpportunities(query);
  }

  @Get('price-impact/:tokenAddress')
  @ApiOperation({ summary: 'Calculate price impact for a large trade' })
  @ApiResponse({ status: 200, description: 'Returns price impact analysis', type: Object })
  async calculatePriceImpact(
    @Param('tokenAddress') tokenAddress: string,
    @Query('chainId') chainId: string,
    @Query('dexName') dexName: string,
    @Query('amountUsd') amountUsd: string,
  ): Promise<PriceImpactResult> {
    return this.priceAnalyticsService.calculatePriceImpact(
      tokenAddress,
      chainId,
      dexName,
      parseFloat(amountUsd),
    );
  }

  @Get('liquidity/:tokenAddress')
  @ApiOperation({ summary: 'Analyze liquidity depth across venues' })
  @ApiResponse({ status: 200, description: 'Returns liquidity analysis', type: Object })
  async analyzeLiquidityDepth(@Param('tokenAddress') tokenAddress: string): Promise<LiquidityDepthAnalysis> {
    return this.priceAnalyticsService.analyzeLiquidityDepth(tokenAddress);
  }

  @Get('analytics/:tokenAddress')
  @ApiOperation({ summary: 'Get historical spread and arbitrage analytics' })
  @ApiResponse({ status: 200, description: 'Returns historical analytics', type: Object })
  async getHistoricalAnalytics(
    @Param('tokenAddress') tokenAddress: string,
    @Query('timeframe') timeframe: string = '24h',
  ): Promise<HistoricalAnalytics> {
    return this.priceAnalyticsService.getHistoricalAnalytics(tokenAddress, timeframe);
  }

  @Post('update/:tokenAddress')
  @ApiOperation({ summary: 'Manually trigger price update for a token' })
  @ApiResponse({ status: 200, description: 'Price update triggered' })
  async updatePrices(@Param('tokenAddress') tokenAddress: string) {
    await this.priceAggregationService.updatePrices(tokenAddress);
    return { success: true, message: 'Price update triggered' };
  }
}
