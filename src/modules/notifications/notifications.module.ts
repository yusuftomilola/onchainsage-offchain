import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './controller/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { Notification } from './entities/notification.entity';
import { User } from '../community/entities/user.entity';
import { NotificationService } from '../community/services/notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}

