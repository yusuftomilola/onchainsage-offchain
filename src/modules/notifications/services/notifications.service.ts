import { Injectable } from '@nestjs/common';
import { AlertRuleEngineService } from '../services/alert-rule-engine.service';
import { EmailNotificationService } from '../services/email-notification.service';
import { SmsNotificationService } from '../services/sms-notification.service';
import { PushNotificationService } from '../services/push-notification.service';
import { WebhookNotificationService } from '../services/webhook-notification.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { AlertAnalyticsService } from '../services/alert-analytics.service';
import { AlertRule, AlertEvent, NotificationChannel, AlertPriority } from '../interfaces/alert.interface';
import { CreateAlertRuleDto, UpdateAlertRuleDto, AlertRuleQueryDto } from '../dto/alert-rule.dto';

@Injectable()
export class NotificationService {
  private alertRules: Map<string, AlertRule[]> = new Map(); // In production, use database
  private alertHistory: Map<string, AlertEvent[]> = new Map();
  private userSubscriptions: Map<string, any> = new Map();

  constructor(
    private readonly ruleEngine: AlertRuleEngineService,
    private readonly emailService: EmailNotificationService,
    private readonly smsService: SmsNotificationService,
    private readonly pushService: PushNotificationService,
    private readonly webhookService: WebhookNotificationService,
    private readonly rateLimiter: RateLimiterService,
    private readonly analytics: AlertAnalyticsService,
  ) {
    // Start the alert monitoring loop
    this.startAlertMonitoring();
  }

  async createAlertRule(userId: string, createDto: CreateAlertRuleDto): Promise<AlertRule> {
    // Convert AlertFrequencyDto to AlertFrequency, handling undefined safely
    let frequency: AlertRule['frequency'];
    if (createDto.frequency) {
      frequency = {
      type: createDto.frequency.type,
      cooldownMinutes: createDto.frequency.cooldownMinutes,
      maxPerHour: createDto.frequency.maxPerHour,
      maxPerDay: createDto.frequency.maxPerDay,
      };
    } else {
      // Provide a sensible default if frequency is not provided
      frequency = { type: 'recurring' };
    }

    const alertRule: AlertRule = {
      id: this.generateId(),
      userId,
      name: createDto.name || `Alert Rule ${new Date().toISOString()}`,
      description: createDto.description,
      conditions: (createDto.conditions ?? []).map(condition => ({
      ...condition,
      id: this.generateId(),
      })),
      logicOperator: createDto.logicOperator ?? "AND",
      channels: (createDto.channels ?? []).map(channel => ({
      ...channel,
      config: channel.config ?? {},
      })),
      priority: createDto.priority || AlertPriority.MEDIUM,
      frequency,
      isActive: createDto.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      triggerCount: 0,
    };

    const userRules = this.alertRules.get(userId) || [];
    userRules.push(alertRule);
    this.alertRules.set(userId, userRules);

    return alertRule;
  }

  async getUserAlertRules(userId: string, query: AlertRuleQueryDto): Promise<{ rules: AlertRule[], total: number }> {
    const userRules = this.alertRules.get(userId) || [];
    let filteredRules = userRules;

    // Apply filters
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredRules = filteredRules.filter(rule => 
        rule.name.toLowerCase().includes(searchLower) ||
        rule.description?.toLowerCase().includes(searchLower)
      );
    }

    if (query.priority) {
      filteredRules = filteredRules.filter(rule => rule.priority === query.priority);
    }

    if (query.isActive !== undefined) {
      filteredRules = filteredRules.filter(rule => rule.isActive === query.isActive);
    }

    // Pagination
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;
    const paginatedRules = filteredRules.slice(start, start + limit);

    return {
      rules: paginatedRules,
      total: filteredRules.length,
    };
  }

  async getAlertRule(userId: string, ruleId: string): Promise<AlertRule | null> {
    const userRules = this.alertRules.get(userId) || [];
    return userRules.find(rule => rule.id === ruleId) || null;
  }

  async updateAlertRule(userId: string, ruleId: string, updateDto: UpdateAlertRuleDto): Promise<AlertRule | null> {
    const userRules = this.alertRules.get(userId) || [];
    const ruleIndex = userRules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) return null;

    const existingRule = userRules[ruleIndex];
    const updatedRule: AlertRule = {
      ...existingRule,
      ...updateDto,
      updatedAt: new Date(),
      conditions: updateDto.conditions ? updateDto.conditions.map(condition => ({
        ...condition,
        id: this.generateId(),
      })) : existingRule.conditions,
      channels: updateDto.channels
        ? updateDto.channels.map(channel => ({
            ...channel,
            config: channel.config ?? {},
          }))
        : existingRule.channels,
    };

    userRules[ruleIndex] = updatedRule;
    this.alertRules.set(userId, userRules);

    return updatedRule;
  }

  async deleteAlertRule(userId: string, ruleId: string): Promise<boolean> {
    const userRules = this.alertRules.get(userId) || [];
    const filteredRules = userRules.filter(rule => rule.id !== ruleId);
    
    if (filteredRules.length === userRules.length) {
      return false; // Rule not found
    }

    this.alertRules.set(userId, filteredRules);
    return true;
  }

  async testAlertRule(userId: string, ruleId: string): Promise<{ success: boolean, message: string }> {
    const rule = await this.getAlertRule(userId, ruleId);
    if (!rule) {
      return { success: false, message: 'Alert rule not found' };
    }

    try {
      // Create a test alert event
      const testEvent: AlertEvent = {
        id: this.generateId(),
        ruleId: rule.id,
        userId,
        triggeredAt: new Date(),
        data: {
          test: true,
          alertName: rule.name,
          message: 'This is a test alert',
        },
        channels: rule.channels.filter(channel => channel.enabled),
        status: 'pending',
        deliveryResults: [],
      };

      await this.sendNotifications(testEvent);

      return { success: true, message: 'Test alert sent successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, message: `Test failed: ${errorMessage}` };
    }
  }

  async getAlertHistory(userId: string, query: any): Promise<{ events: AlertEvent[], total: number }> {
    const userHistory = this.alertHistory.get(userId) || [];
    
    // Apply filters and pagination (simplified)
    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    
    const paginatedEvents = userHistory
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(start, start + limit);

    return {
      events: paginatedEvents,
      total: userHistory.length,
    };
  }

  async getAlertAnalytics(userId: string): Promise<any> {
    const metrics = this.analytics.getUserAlertMetrics(userId);
    const recommendations = this.analytics.getChannelRecommendations(userId);
    
    return {
      metrics,
      recommendations,
      insights: this.generateInsights(metrics),
    };
  }

  async recordUserInteraction(userId: string, alertId: string, action: string): Promise<void> {
    this.analytics.recordUserInteraction(userId, alertId, action as any);
  }

  async getAlertTemplates(): Promise<any[]> {
    return [
      {
        id: 'price_above',
        name: 'Price Above Threshold',
        description: 'Alert when price goes above a specific value',
        template: {
          conditions: [
            { field: 'price', operator: 'gt', value: '0' }
          ],
          logicOperator: 'AND',
          priority: 'medium',
        }
      },
      {
        id: 'volume_spike',
        name: 'Volume Spike',
        description: 'Alert when volume increases significantly',
        template: {
          conditions: [
            { field: 'volume', operator: 'pct_change', value: '50' }
          ],
          logicOperator: 'AND',
          priority: 'high',
        }
      },
      {
        id: 'price_drop',
        name: 'Significant Price Drop',
        description: 'Alert when price drops by a percentage',
        template: {
          conditions: [
            { field: 'price', operator: 'pct_change', value: '-10' }
          ],
          logicOperator: 'AND',
          priority: 'critical',
        }
      },
      {
        id: 'rsi_oversold',
        name: 'RSI Oversold',
        description: 'Alert when RSI indicates oversold conditions',
        template: {
          conditions: [
            { field: 'rsi', operator: 'lt', value: '30' }
          ],
          logicOperator: 'AND',
          priority: 'medium',
        }
      },
    ];
  }

  async subscribeToPushNotifications(userId: string, subscription: any): Promise<void> {
    const userSubs = this.userSubscriptions.get(userId) || [];
    userSubs.push(subscription);
    this.userSubscriptions.set(userId, userSubs);
  }

  private async startAlertMonitoring(): Promise<void> {
    // Monitor market data and evaluate alert rules
    setInterval(async () => {
      await this.evaluateAllAlerts();
    }, 5000); // Check every 5 seconds
  }

  private async evaluateAllAlerts(): Promise<void> {
    // Get current market data (this would come from your data ingestion module)
    const currentData = await this.getCurrentMarketData();

    // Evaluate all active alert rules
    for (const [userId, rules] of this.alertRules) {
      for (const rule of rules) {
        if (!rule.isActive) continue;

        try {
          // Check rate limits
          if (!this.rateLimiter.canSendAlert(rule)) {
            continue;
          }

          // Evaluate rule conditions
          const shouldTrigger = await this.ruleEngine.evaluateRule(rule, currentData);
          
          if (shouldTrigger) {
            await this.triggerAlert(rule, currentData);
            this.rateLimiter.recordAlertSent(rule.id);
          }
        } catch (error) {
          console.error(`Error evaluating alert rule ${rule.id}:`, error);
        }
      }
    }
  }

  private async getCurrentMarketData(): Promise<Record<string, any>> {
    // This would integrate with your data-ingestion module
    // For now, return mock data
    return {
      'BTC_price': 45000 + Math.random() * 1000,
      'ETH_price': 3000 + Math.random() * 200,
      'BTC_volume': 1000000 + Math.random() * 100000,
      'ETH_volume': 500000 + Math.random() * 50000,
      'BTC_rsi': 30 + Math.random() * 40,
      'ETH_rsi': 30 + Math.random() * 40,
    };
  }

  private async triggerAlert(rule: AlertRule, currentData: Record<string, any>): Promise<void> {
    const alertEvent: AlertEvent = {
      id: this.generateId(),
      ruleId: rule.id,
      userId: rule.userId,
      triggeredAt: new Date(),
      data: {
        alertName: rule.name,
        priority: rule.priority,
        conditions: rule.conditions,
        currentData,
        ...this.extractRelevantData(rule, currentData),
      },
      channels: rule.channels.filter(channel => channel.enabled),
      status: 'pending',
      deliveryResults: [],
    };

    // Update rule statistics
    const userRules = this.alertRules.get(rule.userId) || [];
    const ruleIndex = userRules.findIndex(r => r.id === rule.id);
    if (ruleIndex !== -1) {
      userRules[ruleIndex].triggerCount++;
      userRules[ruleIndex].lastTriggered = new Date();
      this.alertRules.set(rule.userId, userRules);
    }

    // Send notifications
    await this.sendNotifications(alertEvent);

    // Store in history
    const userHistory = this.alertHistory.get(rule.userId) || [];
    userHistory.push(alertEvent);
    // Keep only last 1000 events per user
    if (userHistory.length > 1000) {
      userHistory.splice(0, userHistory.length - 1000);
    }
    this.alertHistory.set(rule.userId, userHistory);

    // Record analytics
    this.analytics.recordAlertEvent(alertEvent);
  }

  private async sendNotifications(alertEvent: AlertEvent): Promise<void> {
    const deliveryPromises = alertEvent.channels.map(async (channel) => {
      const startTime = Date.now();
      
      try {
        switch (channel.type) {
          case 'email':
            // Only pass EmailConfig to emailService
            await this.emailService.sendAlert(
              alertEvent,
              channel.config as import('../interfaces/alert.interface').EmailConfig,
              'user@example.com'
            ); // Get from user profile
            break;
          case 'sms':
            await this.smsService.sendAlert(alertEvent, channel.config as import('../interfaces/alert.interface').SmsConfig);
            break;
          case 'push':
            await this.pushService.sendAlert(alertEvent, channel.config as import('../interfaces/alert.interface').PushConfig);
            break;
          case 'webhook':
            await this.webhookService.sendAlert(alertEvent, channel.config as import('../interfaces/alert.interface').WebhookConfig);
            break;
        }

        const deliveryTime = Date.now() - startTime;
        alertEvent.deliveryResults.push({
          channel: channel.type,
          status: 'success',
          sentAt: new Date(),
          deliveryTime,
        });
      } catch (error) {
        const deliveryTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        alertEvent.deliveryResults.push({
          channel: channel.type,
          status: 'failed',
          error: errorMessage,
          deliveryTime,
        });
      }
    });

    await Promise.allSettled(deliveryPromises);
    alertEvent.status = alertEvent.deliveryResults.every(result => result.status === 'success') ? 'sent' : 'failed';
  }

  private extractRelevantData(rule: AlertRule, currentData: Record<string, any>): Record<string, any> {
    const relevantData: Record<string, any> = {};
    
    rule.conditions.forEach(condition => {
      const key = condition.symbol ? `${condition.symbol}_${condition.field}` : condition.field;
      if (currentData[key] !== undefined) {
        relevantData[condition.field] = currentData[key];
        if (condition.symbol) {
          relevantData.symbol = condition.symbol;
        }
        
        // Add formatted values for display
        if (condition.field === 'price') {
          relevantData.currentPrice = currentData[key].toFixed(2);
        }
        
        // Generate condition text for notifications
        relevantData.conditionText = `${condition.field} ${condition.operator} ${condition.value}`;
      }
    });
    
    return relevantData;
  }

  private generateInsights(metrics: any): string[] {
    const insights = [];
    
    if (metrics.successRate < 0.9) {
      insights.push('Alert delivery success rate could be improved. Check your notification settings.');
    }
    
    if (metrics.userEngagement.openRate < 0.4) {
      insights.push('Consider making your alerts more specific to improve engagement.');
    }
    
    if (metrics.totalAlerts > 50) {
      insights.push('You have many active alerts. Consider consolidating similar conditions.');
    }
    
    return insights;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
