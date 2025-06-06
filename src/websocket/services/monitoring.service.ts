import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ConnectionMetrics } from "../entities/connection-metrics.entity"
import type { ConnectionManagerService } from "./connection-manager.service"
import type { MessageQueueService } from "./message-queue.service"

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name)
  private readonly connectionEvents = new Map<string, number>() // event type -> count
  private readonly performanceMetrics = {
    messagesSent: 0,
    messagesQueued: 0,
    connectionsTotal: 0,
    disconnectionsTotal: 0,
    errorsTotal: 0,
  };

  constructor(
    private readonly connectionMetricsRepository: Repository<ConnectionMetrics>,
    private readonly connectionManager: ConnectionManagerService,
    private readonly messageQueueService: MessageQueueService,
    @InjectRepository(ConnectionMetrics)
    private connectionMetricsRepo: Repository<ConnectionMetrics>,
  ) {}

  recordConnection(userId: string) {
    this.performanceMetrics.connectionsTotal++
    this.recordEvent("connection")
  }

  recordDisconnection(userId: string) {
    this.performanceMetrics.disconnectionsTotal++
    this.recordEvent("disconnection")
  }

  recordMessageSent() {
    this.performanceMetrics.messagesSent++
    this.recordEvent("message_sent")
  }

  recordMessageQueued() {
    this.performanceMetrics.messagesQueued++
    this.recordEvent("message_queued")
  }

  recordError(error: string) {
    this.performanceMetrics.errorsTotal++
    this.recordEvent("error")
    this.logger.error(`WebSocket error recorded: ${error}`)
  }

  private recordEvent(eventType: string) {
    const current = this.connectionEvents.get(eventType) || 0
    this.connectionEvents.set(eventType, current + 1)
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics() {
    const metrics = this.connectionMetricsRepository.create({
      timestamp: new Date(),
      activeConnections: this.connectionManager.getActiveConnectionsCount(),
      onlineUsers: this.connectionManager.getOnlineUsersCount(),
      messagesSent: this.performanceMetrics.messagesSent,
      messagesQueued: this.performanceMetrics.messagesQueued,
      connectionsTotal: this.performanceMetrics.connectionsTotal,
      disconnectionsTotal: this.performanceMetrics.disconnectionsTotal,
      errorsTotal: this.performanceMetrics.errorsTotal,
      queueStats: await this.messageQueueService.getQueueStats(),
    })

    await this.connectionMetricsRepository.save(metrics)
  }

  async getMetrics(startDate: Date, endDate: Date): Promise<ConnectionMetrics[]> {
    return this.connectionMetricsRepository.find({
      where: {
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        } as any,
      },
      order: { timestamp: "ASC" },
    })
  }

  async getCurrentStats() {
    const queueStats = await this.messageQueueService.getQueueStats()

    return {
      activeConnections: this.connectionManager.getActiveConnectionsCount(),
      onlineUsers: this.connectionManager.getOnlineUsersCount(),
      performance: { ...this.performanceMetrics },
      queue: queueStats,
      events: Object.fromEntries(this.connectionEvents),
    }
  }

  async getHealthCheck() {
    const stats = await this.getCurrentStats()
    const isHealthy = stats.activeConnections >= 0 && stats.queue.failed < 100

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date(),
      stats,
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldMetrics() {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7) // Keep 7 days of metrics

    const result = await this.connectionMetricsRepository.delete({
      timestamp: { $lt: cutoffDate } as any,
    })

    this.logger.log(`Cleaned up ${result.affected} old metrics records`)
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthChecks() {
    // Clean up inactive connections
    await this.connectionManager.cleanupInactiveConnections()

    // Log current stats
    const stats = await this.getCurrentStats()
    this.logger.log(
      `WebSocket Stats - Active: ${stats.activeConnections}, Online: ${stats.onlineUsers}, Queue: ${stats.queue.waiting} waiting`,
    )
  }
}
