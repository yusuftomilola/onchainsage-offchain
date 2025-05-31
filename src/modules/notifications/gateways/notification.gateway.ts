import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class NotificationGateway {
  @WebSocketServer()
  server: Server | undefined;

  private userSockets = new Map<string, string>(); 

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    this.userSockets.set(data.userId, client.id);
    client.join(`user-${data.userId}`);
  }

  sendNotificationToUser(userId: string, notification: any) {
    if (this.server) {
      this.server.to(`user-${userId}`).emit('notification', notification);
    }
  }

  sendForumUpdate(type: 'post' | 'comment', action: 'create' | 'update' | 'delete', data: any) {
    if (this.server) {
      this.server.emit('forum-update', { type, action, data });
    }
  }
}
