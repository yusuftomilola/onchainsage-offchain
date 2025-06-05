import { Injectable } from '@nestjs/common';
import * as webpush from 'web-push';
import { AlertEvent, PushConfig } from '../interfaces/alert.interface';

@Injectable()
export class PushNotificationService {
  constructor() {
    webpush.setVapidDetails(
      'mailto:' + process.env.VAPID_EMAIL,
      process.env.VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || ''
    );
  }

  async sendAlert(alertEvent: AlertEvent, pushConfig: PushConfig): Promise<void> {
    const payload = this.createPushPayload(alertEvent, pushConfig);
    
    const sendPromises = pushConfig.deviceTokens.map(async (token) => {
      const startTime = Date.now();
      
      try {
        await webpush.sendNotification(
          { endpoint: token, keys: {p256dh: '', auth: ''} }, // Simplified -  store full subscription objects
          JSON.stringify(payload)
        );
        
        const deliveryTime = Date.now() - startTime;
        this.recordDeliveryMetrics('push', 'success', deliveryTime);
        
      } catch (error:any) {
        const deliveryTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.recordDeliveryMetrics('push', 'failed', deliveryTime, errorMessage);
        
        // Handle expired tokens
        if (error.statusCode === 410) {
          await this.removeExpiredToken(token);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  }

  private createPushPayload(alertEvent: AlertEvent, pushConfig: PushConfig) {
    const data = alertEvent.data;
    
    return {
      title: data.symbol ? `${data.symbol} Alert` : 'OnChainSage Alert',
      body: data.conditionText || 'Your alert condition has been triggered',
      icon: '/icons/alert-icon.png',
      badge: pushConfig.badge ? '/icons/badge.png' : undefined,
      sound: pushConfig.sound ? 'default' : 'silent',
      data: {
        alertId: alertEvent.id,
        ruleId: alertEvent.ruleId,
        url: `/alerts/${alertEvent.ruleId}`,
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ]
    };
  }

  private async removeExpiredToken(token: string): Promise<void> {
    // Remove expired push token from database
    console.log(`Removing expired push token: ${token}`);
  }

  private recordDeliveryMetrics(channel: string, status: string, deliveryTime: number, error?: string) {
    console.log(`Push delivery: ${status} in ${deliveryTime}ms`, error ? `Error: ${error}` : '');
  }
}