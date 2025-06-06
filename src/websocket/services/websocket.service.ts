import { Injectable, Logger } from "@nestjs/common"
import type { Server } from "socket.io"
import type { Repository } from "typeorm"
import type { Message } from "../entities/message.entity"

@Injectable()
export class WebSocketService {
  private server: Server
  private readonly logger = new Logger(WebSocketService.name)

  constructor(private readonly messageRepository: Repository<Message>) {}

  setServer(server: Server) {
    this.server = server
  }

  async broadcastToRoom(room: string, event: string, data: any) {
    if (!this.server) {
      this.logger.warn("Server not initialized")
      return
    }

    this.server.to(room).emit(event, data)

    // Store message for offline users
    await this.storeMessage(room, event, data)
  }

  async broadcastToUser(userId: string, event: string, data: any) {
    if (!this.server) {
      this.logger.warn("Server not initialized")
      return
    }

    this.server.to(`user:${userId}`).emit(event, data)

    // Store message for offline users
    await this.storeMessage(`user:${userId}`, event, data)
  }

  async broadcastToAll(event: string, data: any) {
    if (!this.server) {
      this.logger.warn("Server not initialized")
      return
    }

    this.server.emit(event, data)
  }

  private async storeMessage(target: string, event: string, data: any) {
    try {
      const message = this.messageRepository.create({
        target,
        event,
        data: JSON.stringify(data),
        createdAt: new Date(),
      })

      await this.messageRepository.save(message)
    } catch (error) {
      this.logger.error("Failed to store message:", error)
    }
  }

  async getUndeliveredMessages(userId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { target: `user:${userId}`, delivered: false },
      order: { createdAt: "ASC" },
    })
  }

  async markMessageAsDelivered(messageId: number) {
    await this.messageRepository.update(messageId, { delivered: true })
  }
}
