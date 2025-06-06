import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { Notification } from "../entities/notification.entity"
import type { WebSocketService } from "./websocket.service"
import type { ConnectionManagerService } from "./connection-manager.service"
import type { MessageQueueService } from "./message-queue.service"

export interface NotificationData {
  userId: string
  title: string
  message: string
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "TRADING_SIGNAL" | "FORUM_UPDATE"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  metadata?: any
  actionUrl?: string
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    private readonly notificationRepository: Repository<Notification>,
    private readonly webSocketService: WebSocketService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async sendNotification(notificationData: NotificationData) {
    // Store notification in database
    const notification = this.notificationRepository.create({
      userId: notificationData.userId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      priority: notificationData.priority,
      metadata: notificationData.metadata,
      actionUrl: notificationData.actionUrl,
      isRead: false,
      createdAt: new Date(),
    })

    await this.notificationRepository.save(notification)

    // Check if user is online
    if (this.connectionManager.isUserOnline(notificationData.userId)) {
      // Send immediately via WebSocket
      await this.webSocketService.broadcastToUser(notificationData.userId, "notification", {
        id: notification.id,
        ...notificationData,
        timestamp: notification.createdAt,
      })
    } else {
      // Queue for offline user
      await this.messageQueueService.queueMessage({
        userId: notificationData.userId,
        event: "notification",
        data: {
          id: notification.id,
          ...notificationData,
          timestamp: notification.createdAt,
        },
        priority: this.getPriorityWeight(notificationData.priority),
      })
    }

    this.logger.log(`Notification sent to user ${notificationData.userId}: ${notificationData.title}`)
    return notification
  }

  async sendBulkNotifications(notifications: NotificationData[]) {
    const results = []

    for (const notificationData of notifications) {
      try {
        const result = await this.sendNotification(notificationData)
        results.push(result)
      } catch (error) {
        this.logger.error(`Failed to send notification to ${notificationData.userId}:`, error)
      }
    }

    return results
  }

  async markAsRead(notificationId: number, userId: string) {
    const result = await this.notificationRepository.update(
      { id: notificationId, userId },
      { isRead: true, readAt: new Date() },
    )

    if (result.affected > 0) {
      // Notify user that notification was marked as read
      await this.webSocketService.broadcastToUser(userId, "notification-read", {
        notificationId,
        timestamp: new Date(),
      })
    }

    return result.affected > 0
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    )

    if (result.affected > 0) {
      // Notify user that all notifications were marked as read
      await this.webSocketService.broadcastToUser(userId, "notifications-all-read", {
        count: result.affected,
        timestamp: new Date(),
      })
    }

    return result.affected
  }

  async getUserNotifications(userId: string, limit = 50, offset = 0, unreadOnly = false): Promise<Notification[]> {
    const query = this.notificationRepository
      .createQueryBuilder("notification")
      .where("notification.userId = :userId", { userId })
      .orderBy("notification.createdAt", "DESC")
      .limit(limit)
      .offset(offset)

    if (unreadOnly) {
      query.andWhere("notification.isRead = :isRead", { isRead: false })
    }

    return query.getMany()
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    })
  }

  async deleteNotification(notificationId: number, userId: string) {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    })

    if (result.affected > 0) {
      // Notify user that notification was deleted
      await this.webSocketService.broadcastToUser(userId, "notification-deleted", {
        notificationId,
        timestamp: new Date(),
      })
    }

    return result.affected > 0
  }

  async cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await this.notificationRepository.delete({
      createdAt: { $lt: cutoffDate } as any,
      isRead: true,
    })

    this.logger.log(`Cleaned up ${result.affected} old notifications`)
    return result.affected
  }

  private getPriorityWeight(priority: string): number {
    const weights = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      URGENT: 4,
    }
    return weights[priority] || 1
  }
}
