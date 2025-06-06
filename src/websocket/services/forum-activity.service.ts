import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { ForumActivity } from "../entities/forum-activity.entity"
import type { WebSocketService } from "./websocket.service"
import type { ConnectionManagerService } from "./connection-manager.service"

export interface ForumActivityData {
  forumId: number
  userId: string
  activityType: "POST_CREATED" | "POST_UPDATED" | "POST_DELETED" | "COMMENT_ADDED" | "LIKE_ADDED" | "USER_JOINED"
  entityId?: number
  entityType?: "POST" | "COMMENT"
  metadata?: any
}

@Injectable()
export class ForumActivityService {
  private readonly logger = new Logger(ForumActivityService.name)
  private readonly userSubscriptions = new Map<string, Set<number>>() // userId -> Set of forumIds

  constructor(
    private readonly forumActivityRepository: Repository<ForumActivity>,
    private readonly webSocketService: WebSocketService,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  async subscribeUser(userId: string, forumIds?: number[]) {
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set())
    }

    const userForums = this.userSubscriptions.get(userId)

    if (forumIds && forumIds.length > 0) {
      forumIds.forEach((forumId) => userForums.add(forumId))
    }

    this.logger.log(`User ${userId} subscribed to forum activities: ${forumIds || "NONE"}`)
  }

  async unsubscribeUser(userId: string, forumIds?: number[]) {
    if (!this.userSubscriptions.has(userId)) {
      return
    }

    const userForums = this.userSubscriptions.get(userId)

    if (forumIds && forumIds.length > 0) {
      forumIds.forEach((forumId) => userForums.delete(forumId))
    } else {
      userForums.clear()
    }

    if (userForums.size === 0) {
      this.userSubscriptions.delete(userId)
    }

    this.logger.log(`User ${userId} unsubscribed from forum activities: ${forumIds || "ALL"}`)
  }

  async broadcastForumActivity(activityData: ForumActivityData) {
    // Store activity in database
    const activity = this.forumActivityRepository.create({
      forumId: activityData.forumId,
      userId: activityData.userId,
      activityType: activityData.activityType,
      entityId: activityData.entityId,
      entityType: activityData.entityType,
      metadata: activityData.metadata,
      createdAt: new Date(),
    })

    await this.forumActivityRepository.save(activity)

    // Broadcast to subscribed users
    for (const [userId, subscribedForums] of this.userSubscriptions.entries()) {
      if (subscribedForums.has(activityData.forumId)) {
        if (this.connectionManager.isUserOnline(userId)) {
          await this.webSocketService.broadcastToUser(userId, "forum-activity", {
            id: activity.id,
            ...activityData,
            timestamp: activity.createdAt,
          })
        }
      }
    }

    // Broadcast to forum-specific room
    await this.webSocketService.broadcastToRoom(`forum:${activityData.forumId}`, "forum-activity", {
      id: activity.id,
      ...activityData,
      timestamp: activity.createdAt,
    })

    this.logger.log(`Forum activity broadcasted for forum ${activityData.forumId}: ${activityData.activityType}`)
  }

  async getRecentActivities(forumId: number, limit = 50): Promise<ForumActivity[]> {
    return this.forumActivityRepository.find({
      where: { forumId },
      order: { createdAt: "DESC" },
      take: limit,
    })
  }

  async getActivitiesByTimeRange(forumId: number, startDate: Date, endDate: Date): Promise<ForumActivity[]> {
    return this.forumActivityRepository
      .createQueryBuilder("activity")
      .where("activity.forumId = :forumId", { forumId })
      .andWhere("activity.createdAt BETWEEN :startDate AND :endDate", { startDate, endDate })
      .orderBy("activity.createdAt", "DESC")
      .getMany()
  }

  async getUserActivityCount(userId: string, forumId?: number): Promise<number> {
    const query = this.forumActivityRepository
      .createQueryBuilder("activity")
      .where("activity.userId = :userId", { userId })

    if (forumId) {
      query.andWhere("activity.forumId = :forumId", { forumId })
    }

    return query.getCount()
  }
}
