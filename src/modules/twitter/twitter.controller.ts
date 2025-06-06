import { Controller, Get, Query, Post, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

@Controller('twitter/webhook')
export class TwitterController {
  private readonly logger = new Logger(TwitterController.name);
  private readonly consumerSecret = process.env.TWITTER_CONSUMER_SECRET!;

  @Get()
  handleCRC(@Query('crc_token') crcToken: string, @Res() res: Response) {
    if (!crcToken) {
      return res.status(400).send('Missing crc_token');
    }
    const hmac = crypto
      .createHmac('sha256', this.consumerSecret)
      .update(crcToken)
      .digest('base64');
    res.json({ response_token: `sha256=${hmac}` });
  }

  @Post()
  async handleWebhook(@Req() req: Request) {
    this.logger.log('Incoming webhook payload from Twitter');
    const payload = req.body;
    return { status: 'received' };
  }
}
import { Controller, Get, Post, Body, Query, UseGuards, Logger, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TwitterService } from './twitter.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiProperty } from '@nestjs/swagger';

export class SearchTweetsDto {
  @ApiProperty({ description: 'Search query' })
  query!: string;

  @ApiProperty({ description: 'Start time for search', required: false })
  startTime?: Date;

  @ApiProperty({ description: 'End time for search', required: false })
  endTime?: Date;

  @ApiProperty({ description: 'Maximum number of results', required: false })
  maxResults?: number;
}

export class AnalyzeTrendsDto {
  keywords!: string[];
}

export class StreamConfigDto {
  @ApiProperty({ description: 'Keywords to track', type: [String] })
  keywords: string[] = [];

  @ApiProperty({ description: 'Stream filters', required: false })
  filters?: {
    minFollowers?: number;
    minEngagement?: number;
    languages?: string[];
  };
}

@ApiTags('twitter')
@Controller('twitter')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
@ApiBearerAuth()
export class TwitterController {
  private readonly logger = new Logger(TwitterController.name);

  constructor(private readonly twitterService: TwitterService) {}

  @Post('stream/start')
  @ApiOperation({ summary: 'Start Twitter stream with custom configuration' })
  @ApiResponse({ status: 200, description: 'Stream started successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async startStream(@Body() config: StreamConfigDto) {
    this.logger.debug('Starting Twitter stream with config:', config);
    return this.twitterService.startStreaming();
  }

  @Post('search')
  @ApiOperation({ summary: 'Search tweets' })
  @ApiResponse({ status: 200, description: 'Tweets found successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchTweets(@Body(ValidationPipe) searchDto: SearchTweetsDto) {
    this.logger.debug(`Searching tweets with query: ${searchDto.query}`);
    return this.twitterService.searchTweets(
      searchDto.query,
      searchDto.startTime,
      searchDto.endTime,
    );
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get Twitter API usage metrics' })
  @ApiResponse({ status: 200, description: 'API metrics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMetrics() {
    this.logger.debug('Fetching API metrics');
    return this.twitterService.getApiMetrics();
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending topics' })
  @ApiResponse({ status: 200, description: 'Trending topics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrendingTopics(@Query('woeid') woeid?: number) {
    this.logger.debug('Fetching trending topics');
    return this.twitterService.getTrendingTopics(woeid);
  }
} 