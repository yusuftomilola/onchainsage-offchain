import { type CanActivate, type ExecutionContext, Injectable, Logger } from "@nestjs/common"
import type { JwtService } from "@nestjs/jwt"
import type { Socket } from "socket.io"

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebSocketAuthGuard.name)

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient()
      const token = this.extractTokenFromHandshake(client)

      if (!token) {
        this.logger.warn("No token provided in WebSocket handshake")
        return false
      }

      const payload = this.jwtService.verify(token)

      // Add user info to socket handshake for later use
      client.handshake.auth = {
        ...client.handshake.auth,
        userId: payload.sub || payload.userId,
        user: payload,
      }

      return true
    } catch (error) {
      this.logger.error("WebSocket authentication failed:", error.message)
      return false
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    // Try to get token from auth object
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token
    }

    // Try to get token from query parameters
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string
    }

    // Try to get token from headers
    const authHeader = client.handshake.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7)
    }

    return null
  }
}
