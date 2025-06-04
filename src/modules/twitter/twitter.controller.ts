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
