import { Processor, Process } from "@nestjs/bull"
import type { Job } from "bull"
import { Logger } from "@nestjs/common"
import type { WebSocketService } from "../services/websocket.service"
import type { QueuedMessage } from "../services/message-queue.service"

@Processor("message-queue")
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name)

  constructor(private readonly webSocketService: WebSocketService) {}

  @Process("deliver-message")
  async handleMessageDelivery(job: Job<QueuedMessage>) {
    const { userId, event, data } = job.data

    try {
      await this.webSocketService.broadcastToUser(userId, event, data)
      this.logger.log(`Successfully delivered queued message to user ${userId}: ${event}`)
    } catch (error) {
      this.logger.error(`Failed to deliver queued message to user ${userId}:`, error)
      throw error // This will trigger job retry
    }
  }
}
