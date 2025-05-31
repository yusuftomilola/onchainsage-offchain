import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { User } from '../../community/entities/user.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createNotification(
    recipientId: string,
    actorId: string,
    type: string,
    title: string,
    message: string,
    entityId?: string,
    entityType?: string,
  ): Promise<Notification> {
    const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
    const actor = await this.userRepository.findOne({ where: { id: actorId } });

const notification = new Notification();
notification.type = type;
notification.title = title;
notification.message = message;
notification.entityId = entityId ?? '';
notification.entityType = entityType ?? '';

if (!recipient) {
  throw new Error('Recipient not found');
}
if (!actor) {
  throw new Error('Actor not found');
}
notification.recipient = recipient;
notification.actor = actor;

return this.notificationRepository.save(notification);
  }
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { recipient: { id: userId } },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { recipient: { id: userId }, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, recipient: { id: userId } },
      { isRead: true },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { recipient: { id: userId } },
      { isRead: true },
    );
  }
}
