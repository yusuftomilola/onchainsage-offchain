import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets"
import type { Server, Socket } from "socket.io"
import { UseGuards, Logger } from "@nestjs/common"
import { Throttle } from "@nestjs/throttler"

import { WebSocketAuthGuard } from "./guards/websocket-auth.guard"
import { WebSocketRateLimitGuard } from "./guards/websocket-rate-limit.guard"
import type { ConnectionManagerService } from "./services/connection-manager.service"
import type { TradingSignalService } from "./services/trading-signal.service"
import type { ForumActivityService } from "./services/forum-activity.service"
import type { NotificationService } from "./services/notification.service"
import type { MonitoringService } from "./services/monitoring.service"

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
  namespace: "/realtime",
})
@UseGuards(WebSocketAuthGuard, WebSocketRateLimitGuard)
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(WebSocketGateway.name)

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly tradingSignalService: TradingSignalService,
    private readonly forumActivityService: ForumActivityService,
    private readonly notificationService: NotificationService,
    private readonly monitoringService: MonitoringService,
  ) {}

  afterInit(server: Server) {
    this.logger.log("WebSocket Gateway initialized")
    this.connectionManager.setServer(server)
    this.setupHeartbeat()
  }

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.auth?.userId
      if (!userId) {
        client.disconnect()
        return
      }

      await this.connectionManager.handleConnection(client, userId)
      this.monitoringService.recordConnection(userId)

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`)
    } catch (error) {
      this.logger.error("Connection error:", error)
      client.disconnect()
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = client.handshake.auth?.userId
      await this.connectionManager.handleDisconnection(client, userId)
      this.monitoringService.recordDisconnection(userId)

      this.logger.log(`Client disconnected: ${client.id}`)
    } catch (error) {
      this.logger.error("Disconnection error:", error)
    }
  }

  @SubscribeMessage("join-room")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async handleJoinRoom(data: { room: string }, client: Socket) {
    const userId = client.handshake.auth?.userId
    await this.connectionManager.joinRoom(client, data.room, userId)
    client.emit("room-joined", { room: data.room })
  }

  @SubscribeMessage("leave-room")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async handleLeaveRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    const userId = client.handshake.auth?.userId
    await this.connectionManager.leaveRoom(client, data.room, userId)
    client.emit("room-left", { room: data.room })
  }

  @SubscribeMessage("subscribe-trading-signals")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async handleSubscribeTradingSignals(@MessageBody() data: { symbols?: string[] }, @ConnectedSocket() client: Socket) {
    const userId = client.handshake.auth?.userId
    await this.tradingSignalService.subscribeUser(userId, data.symbols)
    client.emit("trading-signals-subscribed", { symbols: data.symbols })
  }

  @SubscribeMessage("subscribe-forum-activity")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async handleSubscribeForumActivity(@MessageBody() data: { forumIds?: number[] }, @ConnectedSocket() client: Socket) {
    const userId = client.handshake.auth?.userId
    await this.forumActivityService.subscribeUser(userId, data.forumIds)
    client.emit("forum-activity-subscribed", { forumIds: data.forumIds })
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    client.emit('heartbeat-ack', { timestamp: Date.now() });
  }

  private setupHeartbeat() {
    setInterval(() => {
      this.server.emit("heartbeat", { timestamp: Date.now() })
    }, 30000) // Every 30 seconds
  }
}
