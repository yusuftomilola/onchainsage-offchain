import { Injectable } from '@nestjs/common';
import { Twilio } from 'twilio';
import { AlertEvent, SmsConfig } from '../interfaces/alert.interface';

@Injectable()
export class SmsNotificationService {
  private twilioClient: Twilio;

  constructor() {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendAlert(alertEvent: AlertEvent, smsConfig: SmsConfig): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Only send SMS for urgent alerts if urgentOnly is true
      if (smsConfig.urgentOnly && alertEvent.data.priority !== 'critical') {
        return;
      }

      const message = this.formatSmsMessage(alertEvent);
      
      await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: smsConfig.phoneNumber,
      });

      const deliveryTime = Date.now() - startTime;
      this.recordDeliveryMetrics('sms', 'success', deliveryTime);
      
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.recordDeliveryMetrics('sms', 'failed', deliveryTime, errorMessage);
      throw error;
    }
  }

  private formatSmsMessage(alertEvent: AlertEvent): string {
    const data = alertEvent.data;
    
    if (data.symbol && data.currentPrice) {
      return `🚨 ${data.symbol}: $${data.currentPrice} | ${data.conditionText} | OnChainSage`;
    }
    
    return `🚨 Alert: ${data.alertName || 'Condition triggered'} | OnChainSage`;
  }

  private recordDeliveryMetrics(channel: string, status: string, deliveryTime: number, error?: string) {
    console.log(`SMS delivery: ${status} in ${deliveryTime}ms`, error ? `Error: ${error}` : '');
  }
}