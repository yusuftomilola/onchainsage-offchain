import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { JwtModule } from "@nestjs/jwt"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { BullModule } from "@nestjs/bull"
import { ThrottlerModule } from "@nestjs/throttler"

import { WebSocketGateway } from "./websocket.gateway"
import { WebSocketService } from "./services/websocket.service"
import { TradingSignalService } from "./services/trading-signal.service"
import { ForumActivityService } from "./services/forum-activity.service"
import { NotificationService } from "./services/notification.service"
import { ConnectionManagerService } from "./services/connection-manager.service"
import { MessageQueueService } from "./services/message-queue.service"
import { MonitoringService } from "./services/monitoring.service"

import { WebSocketAuthGuard } from "./guards/websocket-auth.guard"
import { WebSocketRateLimitGuard } from "./guards/websocket-rate-limit.guard"

import { Message } from "./entities/message.entity"
import { UserConnection } from "./entities/user-connection.entity"
import { TradingSignal } from "./entities/trading-signal.entity"
import { ForumActivity } from "./entities/forum-activity.entity"
import { Notification } from "./entities/notification.entity"
import { ConnectionMetrics } from "./entities/connection-metrics.entity"

import { MessageProcessor } from "./processors/message.processor"

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, UserConnection, TradingSignal, ForumActivity, Notification, ConnectionMetrics]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "24h" },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: "message-queue",
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
  ],
  providers: [
    WebSocketGateway,
    WebSocketService,
    TradingSignalService,
    ForumActivityService,
    NotificationService,
    ConnectionManagerService,
    MessageQueueService,
    MonitoringService,
    WebSocketAuthGuard,
    WebSocketRateLimitGuard,
    MessageProcessor,
  ],
  exports: [WebSocketService, TradingSignalService, ForumActivityService, NotificationService],
})
export class WebSocketModule {}
