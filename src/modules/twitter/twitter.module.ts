import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tweet } from './entities/tweet.entity';
import { TwitterService } from './twitter.service';
import { TwitterController } from './twitter.controller';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://api.twitter.com/2',
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN!}`,
      },
    }),
    TypeOrmModule.forFeature([Tweet]),
  ],
  providers: [TwitterService],
  controllers: [TwitterController],
  exports: [TwitterService],
})
export class TwitterModule {}
