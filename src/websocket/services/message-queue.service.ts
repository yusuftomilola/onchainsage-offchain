import { Injectable, Logger } from "@nestjs/common"
import type { Queue } from "bull"
import type { WebSocketService } from "./websocket.service"

export interface QueuedMessage {
  userId: string
  event: string
  data: any
  priority?: number
  delay?: number
  attempts?: number
}

@Injectable()
export class MessageQueueService {
  private readonly logger = new Logger(MessageQueueService.name)

  constructor(
    private readonly messageQueue: Queue,
    private readonly webSocketService: WebSocketService,
  ) {}

  async queueMessage(message: QueuedMessage) {
    const jobOptions = {
      priority: message.priority || 1,
      delay: message.delay || 0,
      attempts: message.attempts || 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    }

    await this.messageQueue.add("deliver-message", message, jobOptions)

    this.logger.log(`Message queued for user ${message.userId}: ${message.event}`)
  }

  async processQueuedMessages(userId: string) {
    // Get undelivered messages from database
    const undeliveredMessages = await this.webSocketService.getUndeliveredMessages(userId)

    for (const message of undeliveredMessages) {
      try {
        // Send the message
        await this.webSocketService.broadcastToUser(userId, message.event, JSON.parse(message.data))

        // Mark as delivered
        await this.webSocketService.markMessageAsDelivered(message.id)

        this.logger.log(`Delivered queued message ${message.id} to user ${userId}`)
      } catch (error) {
        this.logger.error(`Failed to deliver message ${message.id} to user ${userId}:`, error)
      }
    }
  }

  async getQueueStats() {
    const waiting = await this.messageQueue.getWaiting()
    const active = await this.messageQueue.getActive()
    const completed = await this.messageQueue.getCompleted()
    const failed = await this.messageQueue.getFailed()

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    }
  }

  async clearQueue() {
    await this.messageQueue.clean(0, "completed")
    await this.messageQueue.clean(0, "failed")
    this.logger.log("Message queue cleared")
  }

  async retryFailedJobs() {
    const failedJobs = await this.messageQueue.getFailed()

    for (const job of failedJobs) {
      await job.retry()
    }

    this.logger.log(`Retried ${failedJobs.length} failed jobs`)
  }
}
