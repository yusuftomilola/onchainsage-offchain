import { Controller, Get, Post, Delete, Query } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import type { MonitoringService } from "../services/monitoring.service"
import type { ConnectionManagerService } from "../services/connection-manager.service"
import type { MessageQueueService } from "../services/message-queue.service"
import type { NotificationService } from "../services/notification.service"

@ApiTags("WebSocket Admin")
@ApiBearerAuth()
@Controller("admin/websocket")
export class WebSocketAdminController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly messageQueueService: MessageQueueService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get("stats")
  @ApiOperation({ summary: "Get current WebSocket statistics" })
  @ApiResponse({ status: 200, description: "Current statistics" })
  async getStats() {
    return this.monitoringService.getCurrentStats()
  }

  @Get("health")
  @ApiOperation({ summary: "Get WebSocket health status" })
  @ApiResponse({ status: 200, description: "Health check results" })
  async getHealth() {
    return this.monitoringService.getHealthCheck()
  }

  @Get("metrics")
  @ApiOperation({ summary: "Get historical metrics" })
  @ApiResponse({ status: 200, description: "Historical metrics data" })
  async getMetrics(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return this.monitoringService.getMetrics(start, end)
  }

  @Get("queue/stats")
  @ApiOperation({ summary: "Get message queue statistics" })
  @ApiResponse({ status: 200, description: "Queue statistics" })
  async getQueueStats() {
    return this.messageQueueService.getQueueStats()
  }

  @Post("queue/retry-failed")
  @ApiOperation({ summary: "Retry failed queue jobs" })
  @ApiResponse({ status: 200, description: "Failed jobs retried" })
  async retryFailedJobs() {
    await this.messageQueueService.retryFailedJobs()
    return { message: "Failed jobs have been retried" }
  }

  @Delete("queue/clear")
  @ApiOperation({ summary: "Clear message queue" })
  @ApiResponse({ status: 200, description: "Queue cleared" })
  async clearQueue() {
    await this.messageQueueService.clearQueue()
    return { message: "Queue has been cleared" }
  }

  @Post('notifications/cleanup')
  @ApiOperation({ summary: 'Cleanup old notifications' })
  @ApiResponse({ status: 200, description: 'Old notifications cleaned up' })
  async cleanupNotifications(@Query('daysOld') daysOld: number = 30) {
    const count = await this.notificationService.cleanupOldNotifications(daysOld);
    return { message: `Cleaned up ${count} old notifications` };
  }

  @Get("connections/active")
  @ApiOperation({ summary: "Get active connections count" })
  @ApiResponse({ status: 200, description: "Active connections count" })
  async getActiveConnections() {
    return {
      activeConnections: this.connectionManager.getActiveConnectionsCount(),
      onlineUsers: this.connectionManager.getOnlineUsersCount(),
    }
  }
}
