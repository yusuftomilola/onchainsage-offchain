import { Module } from '@nestjs/common';
import { CommunityPostService } from './community-post.service';
import { CommunityPostController } from './community-post.controller';

@Module({
  controllers: [CommunityPostController],
  providers: [CommunityPostService],
})
export class CommunityPostModule {}
