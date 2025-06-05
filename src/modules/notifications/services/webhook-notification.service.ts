import { Injectable } from '@nestjs/common';
import { AlertEvent, WebhookConfig } from '../interfaces/alert.interface';
import { AxiosRequestConfig } from 'axios';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class WebhookNotificationService {
  constructor(private readonly httpService: HttpService) {}

  async sendAlert(alertEvent: AlertEvent, webhookConfig: WebhookConfig): Promise<void> {
    const maxRetries = webhookConfig.retryConfig.maxRetries;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      const startTime = Date.now();
      
      try {
        const payload = this.createWebhookPayload(alertEvent, webhookConfig);
        const config: AxiosRequestConfig = {
          method: webhookConfig.method,
          url: webhookConfig.url,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'OnChainSage-Webhook/1.0',
            ...webhookConfig.headers,
          },
          data: payload,
          timeout: 10000, // 10 second timeout
        };

        await this.httpService.request(config).toPromise();
        
        const deliveryTime = Date.now() - startTime;
        this.recordDeliveryMetrics('webhook', 'success', deliveryTime);
        return;
        
      } catch (error) {
        const deliveryTime = Date.now() - startTime;
        attempt++;
        
        if (attempt > maxRetries) {
          const errorMessage = (error instanceof Error) ? error.message : String(error);
          this.recordDeliveryMetrics('webhook', 'failed', deliveryTime, errorMessage);
          throw error;
        }
        
        // Exponential backoff
        const delay = webhookConfig.retryConfig.backoffMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
  }

  private createWebhookPayload(alertEvent: AlertEvent, webhookConfig: WebhookConfig) {
    const basePayload = {
      event: 'alert.triggered',
      timestamp: alertEvent.triggeredAt.toISOString(),
      alert: {
        id: alertEvent.id,
        ruleId: alertEvent.ruleId,
        userId: alertEvent.userId,
        data: alertEvent.data,
      },
    };

    // Merge with custom payload
    return { ...basePayload, ...webhookConfig.payload };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordDeliveryMetrics(channel: string, status: string, deliveryTime: number, error?: string) {
    console.log(`Webhook delivery: ${status} in ${deliveryTime}ms`, error ? `Error: ${error}` : '');
  }
}