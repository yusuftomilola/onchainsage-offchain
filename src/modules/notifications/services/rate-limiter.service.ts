import { Injectable } from '@nestjs/common';
import { AlertRule, AlertPriority } from '../interfaces/alert.interface';

interface RateLimitState {
  hourlyCount: number;
  dailyCount: number;
  lastHourReset: Date;
  lastDayReset: Date;
  recentTriggers: Date[];
}

@Injectable()
export class RateLimiterService {
  private rateLimitStates: Map<string, RateLimitState> = new Map();

  canSendAlert(rule: AlertRule): boolean {
    const state = this.getRateLimitState(rule.id);
    const now = new Date();
    
    // Reset counters if needed
    this.resetCountersIfNeeded(state, now);
    
    // Critical alerts bypass most limits
    if (rule.priority === AlertPriority.CRITICAL) {
      return this.checkCriticalAlertLimits(state, now);
    }
    
    // Check frequency limits
    const frequency = rule.frequency;
    
    if (frequency.maxPerHour && state.hourlyCount >= frequency.maxPerHour) {
      return false;
    }
    
    if (frequency.maxPerDay && state.dailyCount >= frequency.maxPerDay) {
      return false;
    }
    
    return true;
  }

  recordAlertSent(ruleId: string): void {
    const state = this.getRateLimitState(ruleId);
    const now = new Date();
    
    state.hourlyCount++;
    state.dailyCount++;
    state.recentTriggers.push(now);
    
    // Keep only last 100 triggers for memory efficiency
    if (state.recentTriggers.length > 100) {
      state.recentTriggers = state.recentTriggers.slice(-100);
    }
  }

  private getRateLimitState(ruleId: string): RateLimitState {
    if (!this.rateLimitStates.has(ruleId)) {
      const now = new Date();
      this.rateLimitStates.set(ruleId, {
        hourlyCount: 0,
        dailyCount: 0,
        lastHourReset: now,
        lastDayReset: now,
        recentTriggers: [],
      });
    }
    return this.rateLimitStates.get(ruleId)!;
  }

  private resetCountersIfNeeded(state: RateLimitState, now: Date): void {
    // Reset hourly counter
    if (now.getTime() - state.lastHourReset.getTime() >= 60 * 60 * 1000) {
      state.hourlyCount = 0;
      state.lastHourReset = now;
    }
    
    // Reset daily counter
    if (now.getTime() - state.lastDayReset.getTime() >= 24 * 60 * 60 * 1000) {
      state.dailyCount = 0;
      state.lastDayReset = now;
    }
  }

  private checkCriticalAlertLimits(state: RateLimitState, now: Date): boolean {
    // Allow max 1 critical alert per minute to prevent spam
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const recentCriticalAlerts = state.recentTriggers.filter(
      trigger => trigger > oneMinuteAgo
    );
    
    return recentCriticalAlerts.length === 0;
  }
}
