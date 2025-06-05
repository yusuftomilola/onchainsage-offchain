import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AlertEvent, EmailConfig } from '../interfaces/alert.interface';


// .env.example
/*
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@onchainsage.com

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications (VAPID)
VAPID_EMAIL=your-email@onchainsage.com
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Redis for rate limiting (optional)
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/onchainsage
*/

@Injectable()
export class EmailNotificationService {
  private transporter!: nodemailer.Transporter;
  private templates: Map<string, any> = new Map();

  constructor() {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendAlert(alertEvent: AlertEvent, emailConfig: EmailConfig, recipientEmail: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const template = this.templates.get(emailConfig.template) || this.getDefaultTemplate();
      const htmlContent = this.renderTemplate(template, alertEvent);
      
      const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: recipientEmail,
        subject: this.generateSubject(alertEvent),
        html: htmlContent,
        priority: emailConfig.priority,
      };

      await this.transporter.sendMail(mailOptions);
      
      const deliveryTime = Date.now() - startTime;
      this.recordDeliveryMetrics('email', 'success', deliveryTime);
      
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      this.recordDeliveryMetrics('email', 'failed', deliveryTime, errorMessage);
      throw error;
    }
  }

  private loadTemplates() {
    // Load email templates
    this.templates.set('price_alert', {
      subject: 'Price Alert: {{symbol}} {{condition}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Price Alert Triggered</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>{{symbol}} - {{alertName}}</h3>
            <p><strong>Current Price:</strong> {{currentPrice}}</p>
            <p><strong>Condition:</strong> {{conditionText}}</p>
            <p><strong>Triggered At:</strong> {{triggeredAt}}</p>
          </div>
          <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #1976d2;">
              📊 View detailed analysis in your OnChainSage dashboard
            </p>
          </div>
        </div>
      `
    });

    this.templates.set('volume_spike', {
      subject: '📈 Volume Spike Alert: {{symbol}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Volume Spike Detected</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>{{symbol}} - Unusual Volume Activity</h3>
            <p><strong>Current Volume:</strong> {{currentVolume}}</p>
            <p><strong>24h Average:</strong> {{avgVolume}}</p>
            <p><strong>Spike Percentage:</strong> +{{spikePercentage}}%</p>
            <p><strong>Detected At:</strong> {{triggeredAt}}</p>
          </div>
        </div>
      `
    });
  }

  private renderTemplate(template: any, alertEvent: AlertEvent): string {
    let html = template.html;
    const data = alertEvent.data;
    
    // Simple template rendering
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), data[key]);
    });
    
    return html;
  }

  private generateSubject(alertEvent: AlertEvent): string {
    const template = this.templates.get('default_subject') || 'OnChainSage Alert';
    return this.renderTemplate({ html: template }, alertEvent);
  }

  private getDefaultTemplate() {
    return {
      subject: 'OnChainSage Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Alert Triggered</h2>
          <p>Your custom alert has been triggered.</p>
          <pre>{{data}}</pre>
        </div>
      `
    };
  }

  private recordDeliveryMetrics(channel: string, status: string, deliveryTime: number, error?: string) {
    // Record metrics for monitoring and analytics
    console.log(`Email delivery: ${status} in ${deliveryTime}ms`, error ? `Error: ${error}` : '');
  }
}