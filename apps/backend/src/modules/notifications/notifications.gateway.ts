import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notifications' })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string[]>();

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token = client.handshake.auth['token'] as string;
      const payload = this.jwtService.verify<{ sub: string; orgId: string }>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      client.data['userId'] = payload.sub;
      client.data['orgId'] = payload.orgId;
      void client.join(`user:${payload.sub}`);
      void client.join(`org:${payload.orgId}`);

      const existing = this.userSockets.get(payload.sub) ?? [];
      this.userSockets.set(payload.sub, [...existing, client.id]);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data['userId'] as string | undefined;
    if (userId) {
      const sockets = this.userSockets.get(userId) ?? [];
      this.userSockets.set(
        userId,
        sockets.filter((id) => id !== client.id),
      );
    }
  }

  @SubscribeMessage('notifications:mark_read')
  handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ): void {
    const userId = client.data['userId'] as string;
    this.server.to(`user:${userId}`).emit('notifications:updated', {
      type: 'read',
      notificationId: data.notificationId,
    });
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    // `server` is undefined until the WS adapter is bound (e.g. when a cron runs
    // in a standalone context); skip the push rather than crash the caller.
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  emitToOrg(orgId: string, event: string, data: unknown): void {
    this.server?.to(`org:${orgId}`).emit(event, data);
  }
}
