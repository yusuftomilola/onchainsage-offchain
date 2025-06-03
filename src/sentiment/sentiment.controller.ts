import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { SentimentService } from './sentiment.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyzeTextDto } from './dto/analyze.text.dto';
import { SentimentResult } from './dto/sentiment.result.dto';
import { BatchAnalyzeDto } from './dto/batch.analyze.dto';

@ApiTags('sentiment')
@Controller('sentiment')
export class SentimentController {
  constructor(private readonly sentimentService: SentimentService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze sentiment of a single text' })
  @ApiResponse({ status: 200, type: SentimentResult })
  async analyzeSentiment(@Body() dto: AnalyzeTextDto): Promise<SentimentResult> {
    return await this.sentimentService.analyzeSentiment(dto.text);
  }

  @Post('batch-analyze')
  @ApiOperation({ summary: 'Analyze sentiment of multiple texts' })
  @ApiResponse({ status: 200, type: [SentimentResult] })
  async batchAnalyze(@Body() dto: BatchAnalyzeDto): Promise<SentimentResult[]> {
    return await this.sentimentService.batchAnalyze(dto.texts);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending topics' })
  @ApiResponse({ status: 200, type: [String] })
  async getTrendingTopics(@Query('timeframe') timeframe: string): Promise<string[]> {
    return await this.sentimentService.getTrendingTopics(timeframe);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get confidence metrics' })
  @ApiResponse({ status: 200 })
  async getConfidenceMetrics() {
    return await this.sentimentService.getConfidenceMetrics();
  }
}
