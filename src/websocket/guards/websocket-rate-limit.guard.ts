import { type CanActivate, type ExecutionContext, Injectable, Logger } from "@nestjs/common"
import { ThrottlerGuard } from "@nestjs/throttler"
import type { Socket } from "socket.io"

@Injectable()
export class WebSocketRateLimitGuard extends ThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(WebSocketRateLimitGuard.name)

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient()
    const userId = client.handshake.auth?.userId

    if (!userId) {
      return false
    }

    // Use user ID as the key for rate limiting
    const key = `websocket:${userId}`

    try {
      return await super.canActivate(context)
    } catch (error) {
      this.logger.warn(`Rate limit exceeded for user ${userId}`)

      // Send rate limit warning to client
      client.emit("rate-limit-warning", {
        message: "Rate limit exceeded. Please slow down your requests.",
        timestamp: new Date(),
      })

      return false
    }
  }

  protected async getTracker(req: any): Promise<string> {
    // Use the user ID from the WebSocket handshake
    return req.handshake?.auth?.userId || req.ip
  }
}
