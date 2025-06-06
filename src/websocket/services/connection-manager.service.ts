import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { Server, Socket } from "socket.io"
import type { UserConnection } from "../entities/user-connection.entity"
import type { MessageQueueService } from "./message-queue.service"

@Injectable()
export class ConnectionManagerService {
  private server: Server
  private readonly logger = new Logger(ConnectionManagerService.name)
  private readonly userConnections = new Map<string, Set<string>>() // userId -> Set of socketIds

  constructor(
    private readonly userConnectionRepository: Repository<UserConnection>,
    private readonly messageQueueService: MessageQueueService,
  ) {}

  setServer(server: Server) {
    this.server = server
  }

  async handleConnection(socket: Socket, userId: string) {
    // Add to in-memory tracking
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set())
    }
    this.userConnections.get(userId).add(socket.id)

    // Join user-specific room
    socket.join(`user:${userId}`)

    // Store connection in database
    const connection = this.userConnectionRepository.create({
      userId,
      socketId: socket.id,
      connectedAt: new Date(),
      isActive: true,
    })
    await this.userConnectionRepository.save(connection)

    // Process queued messages for this user
    await this.messageQueueService.processQueuedMessages(userId)

    this.logger.log(`User ${userId} connected with socket ${socket.id}`)
  }

  async handleDisconnection(socket: Socket, userId: string) {
    // Remove from in-memory tracking
    if (this.userConnections.has(userId)) {
      this.userConnections.get(userId).delete(socket.id)
      if (this.userConnections.get(userId).size === 0) {
        this.userConnections.delete(userId)
      }
    }

    // Update connection in database
    await this.userConnectionRepository.update({ socketId: socket.id }, { isActive: false, disconnectedAt: new Date() })

    this.logger.log(`User ${userId} disconnected from socket ${socket.id}`)
  }

  async joinRoom(socket: Socket, room: string, userId: string) {
    socket.join(room)
    this.logger.log(`User ${userId} joined room ${room}`)
  }

  async leaveRoom(socket: Socket, room: string, userId: string) {
    socket.leave(room)
    this.logger.log(`User ${userId} left room ${room}`)
  }

  isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId) && this.userConnections.get(userId).size > 0
  }

  getUserSocketIds(userId: string): string[] {
    return this.userConnections.has(userId) ? Array.from(this.userConnections.get(userId)) : []
  }

  getOnlineUsersCount(): number {
    return this.userConnections.size
  }

  getActiveConnectionsCount(): number {
    return Array.from(this.userConnections.values()).reduce((total, sockets) => total + sockets.size, 0)
  }

  async cleanupInactiveConnections() {
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago

    await this.userConnectionRepository.update(
      { isActive: true, connectedAt: { $lt: cutoffTime } as any },
      { isActive: false, disconnectedAt: new Date() },
    )
  }
}
