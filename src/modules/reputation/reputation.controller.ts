import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ReputationService } from './reputation.service';

@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Get(':userId')
  getReputation(@Param('userId') userId: number) {
    return this.reputationService.getReputation(userId);
  }

  @Get(':userId/badges')
  getBadges(@Param('userId') userId: number) {
    return this.reputationService.getBadges(userId);
  }

  @Post(':userId/recalculate')
  recalculate(@Param('userId') userId: number) {
    return this.reputationService.calculateReputation(userId);
  }

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit: string) {
    return this.reputationService.getLeaderboard(Number(limit) || 10);
  }
}
