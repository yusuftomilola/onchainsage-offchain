import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TradingCall } from './entities/trading-call.entity';
import { Reputation } from './entities/reputation.entity';
import { ReputationHistory } from './entities/reputation-history.entity';
import { Repository } from 'typeorm';
import { Badge } from './entities/badge.entity';

@Injectable()
export class ReputationService {
  constructor(
    @InjectRepository(TradingCall)
    private callRepo: Repository<TradingCall>,
    @InjectRepository(Reputation)
    private reputationRepo: Repository<Reputation>,
    @InjectRepository(ReputationHistory)
    private historyRepo: Repository<ReputationHistory>,
    @InjectRepository(Badge)
    private badgeRepo: Repository<Badge>,
  ) {}

  async calculateReputation(userId: number) {
    const calls = await this.callRepo.find({ where: { userId, status: 'closed' } });
    const total = calls.length;
    const wins = calls.filter((c) => c.outcome === 'win').length;
    const winRate = total ? wins / total : 0;

    const score = parseFloat((winRate * 60 + (total > 20 ? 20 : total)).toFixed(2));

    await this.reputationRepo.save({ userId, score, lastUpdated: new Date() });
    await this.historyRepo.save({ userId, score, timestamp: new Date() });

    // Penalty logic: revoke badges if win rate < 30%
    if (winRate < 0.3) {
      const userBadges = await this.badgeRepo.find({ where: { userId } });
      for (const badge of userBadges) {
        badge.revokedAt = new Date();
        await this.badgeRepo.save(badge);
      }
    }

    return score;
  }

  async assignBadges(userId: number) {
    const calls = await this.callRepo.find({
      where: { userId, status: 'closed' },
      order: { timestamp: 'DESC' },
    });
    const badges = [];

    const last5 = calls.slice(0, 5);
    const streak = last5.every((c) => c.outcome === 'win');
    if (streak) {
      badges.push('Hot Streak');
    }

    if (calls.length > 100) {
      badges.push('Veteran');
    }

    for (const badgeName of badges) {
      await this.badgeRepo.upsert({ userId, badgeName, earnedAt: new Date() }, [
        'userId',
        'badgeName',
      ]);
    }
  }

  async getReputation(userId: number) {
    return this.reputationRepo.findOneBy({ userId });
  }

  async getBadges(userId: number) {
    return this.badgeRepo.find({ where: { userId } });
  }

  async getLeaderboard(limit = 10) {
    return this.reputationRepo.find({ order: { score: 'DESC' }, take: limit });
  }

  async reviewAllUsers(userIds: number[]) {
    for (const id of userIds) {
      await this.calculateReputation(id);
      await this.assignBadges(id);
    }
  }
}
