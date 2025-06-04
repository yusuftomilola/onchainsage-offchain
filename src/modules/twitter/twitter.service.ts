import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tweet } from './entities/tweet.entity';
import { DEFAULT_KEYWORDS } from './twitter.constants';
import Bottleneck from 'bottleneck';

@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);
  private rateLimiter: any;

  constructor(
    private readonly http: HttpService,
    @InjectRepository(Tweet)
    private readonly tweetRepo: Repository<Tweet>,
  ) {
    this.rateLimiter = new Bottleneck({
      reservoir: 300,
      reservoirRefreshAmount: 300,
      reservoirRefreshInterval: 15 * 60 * 1000,
      maxConcurrent: 1,
      minTime: 200,
    });
  }

  async collectTweets(keywords: string[] = DEFAULT_KEYWORDS): Promise<void> {
    const query = keywords.map((kw) => encodeURIComponent(kw)).join(' OR ');
    const url = `/tweets/search/recent?query=${query}&tweet.fields=author_id,created_at`;

    try {
      const response = await this.rateLimiter.schedule(() =>
        this.http.get(url).toPromise(),
      );
      const tweets: Array<any> = response.data.data || [];

      for (const t of tweets) {
        const exists = await this.tweetRepo.findOne({ where: { id: t.id } });
        if (exists) continue;

        const score = this.computeRelevanceScore(t.text, keywords);
        const tweetEntity = this.tweetRepo.create({
          id: t.id,
          text: t.text,
          authorId: t.author_id,
          createdAt: new Date(t.created_at),
          score,
        });
        await this.tweetRepo.save(tweetEntity);
      }

      this.logger.log(`Collected ${tweets.length} tweets for query "${query}"`);
    } catch (error: any) {
      this.logger.error('Error fetching tweets', error.response?.data || error.message);
      if (error.response?.status === 429) {
        await this.delay(60_000);
        return this.collectTweets(keywords);
      }
    }
  }

  private computeRelevanceScore(text: string, keywords: string[]): number {
    let score = 0;
    for (const kw of keywords) {
      const re = new RegExp(kw.replace(/[#]/g, '\\#'), 'gi');
      const matches = text.match(re);
      if (matches) score += matches.length;
    }
    return score;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
