import { Module } from '@nestjs/common';
import { NotificationController } from '../notifications/controller/notifications.controller';
import { NotificationService } from '../notifications/services/notifications.service';
import { AlertRuleEngineService } from './services/alert-rule-engine.service';
import { EmailNotificationService } from './services/email-notification.service';
import { SmsNotificationService } from './services/sms-notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { WebhookNotificationService } from './services/webhook-notification.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { AlertAnalyticsService } from './services/alert-analytics.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    AlertRuleEngineService,
    EmailNotificationService,
    SmsNotificationService,
    PushNotificationService,
    WebhookNotificationService,
    RateLimiterService,
    AlertAnalyticsService,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}


// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { NotificationsController } from './controller/notifications.controller';
// import { NotificationsService } from './services/notifications.service';
// import { NotificationGateway } from './gateways/notification.gateway';
// import { Notification } from './entities/notification.entity';
// import { User } from '../../user/entities/user.entity';
// import { NotificationService } from '../community/services/notification.service';

// @Module({
//   imports: [TypeOrmModule.forFeature([Notification, User])],
//   controllers: [NotificationsController],
//   providers: [NotificationsService, NotificationGateway],
//   exports: [NotificationsService, NotificationGateway],
// })
// export class NotificationModule {}


