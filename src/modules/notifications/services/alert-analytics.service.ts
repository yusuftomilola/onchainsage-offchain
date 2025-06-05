import { Injectable } from '@nestjs/common';
import { AlertEvent, DeliveryResult } from '../interfaces/alert.interface';

interface AlertMetrics {
  totalAlerts: number;
  successRate: number;
  averageDeliveryTime: number;
  channelPerformance: Map<string, ChannelMetrics>;
  userEngagement: UserEngagementMetrics;
}

interface ChannelMetrics {
  totalSent: number;
  successCount: number;
  failureCount: number;
  averageDeliveryTime: number;
  successRate: number;
}

interface UserEngagementMetrics {
  openRate: number;
  clickRate: number;
  dismissRate: number;
  unsubscribeRate: number;
}

@Injectable()
export class AlertAnalyticsService {
  private metrics: Map<string, AlertMetrics> = new Map();

  recordAlertEvent(alertEvent: AlertEvent): void {
    const userId = alertEvent.userId;
    const userMetrics = this.getUserMetrics(userId);
    
    userMetrics.totalAlerts++;
    
    // Record delivery results
    alertEvent.deliveryResults.forEach(result => {
      this.recordChannelMetrics(userMetrics, result);
    });
  }

  recordUserInteraction(userId: string, alertId: string, action: 'open' | 'click' | 'dismiss' | 'unsubscribe'): void {
    const userMetrics = this.getUserMetrics(userId);
    
    switch (action) {
      case 'open':
        userMetrics.userEngagement.openRate = this.updateRate(userMetrics.userEngagement.openRate, true);
        break;
      case 'click':
        userMetrics.userEngagement.clickRate = this.updateRate(userMetrics.userEngagement.clickRate, true);
        break;
      case 'dismiss':
        userMetrics.userEngagement.dismissRate = this.updateRate(userMetrics.userEngagement.dismissRate, true);
        break;
      case 'unsubscribe':
        userMetrics.userEngagement.unsubscribeRate = this.updateRate(userMetrics.userEngagement.unsubscribeRate, true);
        break;
    }
  }

  getUserAlertMetrics(userId: string): AlertMetrics {
    return this.getUserMetrics(userId);
  }

  getChannelRecommendations(userId: string): string[] {
    const metrics = this.getUserMetrics(userId);
    const recommendations = [];
    
    // Analyze channel performance and suggest optimizations
    metrics.channelPerformance.forEach((channelMetrics, channel) => {
      if (channelMetrics.successRate < 0.8) {
        recommendations.push(`Consider reviewing ${channel} configuration - low success rate`);
      }
      
      if (channelMetrics.averageDeliveryTime > 30000) { // 30 seconds
        recommendations.push(`${channel} delivery is slower than optimal`);
      }
    });
    
    // Engagement-based recommendations
    if (metrics.userEngagement.openRate < 0.3) {
      recommendations.push('Consider improving alert relevance - low open rate');
    }
    
    if (metrics.userEngagement.dismissRate > 0.7) {
      recommendations.push('Too many alerts may be causing user fatigue');
    }
    
    return recommendations;
  }

  private getUserMetrics(userId: string): AlertMetrics {
    if (!this.metrics.has(userId)) {
      this.metrics.set(userId, {
        totalAlerts: 0,
        successRate: 0,
        averageDeliveryTime: 0,
        channelPerformance: new Map(),
        userEngagement: {
          openRate: 0,
          clickRate: 0,
          dismissRate: 0,
          unsubscribeRate: 0,
        },
      });
    }
    return this.metrics.get(userId)!;
  }

  private recordChannelMetrics(userMetrics: AlertMetrics, deliveryResult: DeliveryResult): void {
    const channel = deliveryResult.channel;
    
    if (!userMetrics.channelPerformance.has(channel)) {
      userMetrics.channelPerformance.set(channel, {
        totalSent: 0,
        successCount: 0,
        failureCount: 0,
        averageDeliveryTime: 0,
        successRate: 0,
      });
    }
    
    const channelMetrics = userMetrics.channelPerformance.get(channel)!;
    channelMetrics.totalSent++;
    
    if (deliveryResult.status === 'success') {
      channelMetrics.successCount++;
      if (deliveryResult.deliveryTime) {
        channelMetrics.averageDeliveryTime = this.updateAverage(
          channelMetrics.averageDeliveryTime,
          deliveryResult.deliveryTime,
          channelMetrics.successCount
        );
      }
    } else {
      channelMetrics.failureCount++;
    }
    
    channelMetrics.successRate = channelMetrics.successCount / channelMetrics.totalSent;
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  private updateRate(currentRate: number, increment: boolean): number {
    // Simplified rate calculation - in production, you'd want more sophisticated tracking
    return increment ? Math.min(currentRate + 0.01, 1) : currentRate;
  }
}