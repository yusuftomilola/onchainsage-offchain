import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SentimentService } from './sentiment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnalyzeSentimentDto, AnalyzeBatchSentimentDto, SentimentResultDto } from './dto/sentiment.dto';

export interface SentimentResult {
  score: number;
  magnitude: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  context?: {
    source: string;
    author: string;
    timestamp: Date;
  };
}

@ApiTags('sentiment')
@Controller('sentiment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SentimentController {
  private readonly logger = new Logger(SentimentController.name);

  constructor(private readonly sentimentService: SentimentService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze sentiment of text' })
  @ApiResponse({ status: 200, description: 'Sentiment analyzed successfully', type: SentimentResultDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzeSentiment(@Body() body: AnalyzeSentimentDto): Promise<SentimentResult> {
    this.logger.debug(`Analyzing sentiment for text: ${body.text}`);
    return this.sentimentService.analyzeSentiment(body.text);
  }

  @Post('analyze/batch')
  @ApiOperation({ summary: 'Analyze sentiment of multiple texts' })
  @ApiResponse({ status: 200, description: 'Sentiments analyzed successfully', type: [SentimentResultDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzeBatchSentiment(@Body() body: AnalyzeBatchSentimentDto): Promise<SentimentResult[]> {
    this.logger.debug(`Analyzing batch sentiment for ${body.texts.length} texts`);
    return this.sentimentService.analyzeBatchSentiment(body.texts);
  }
} 