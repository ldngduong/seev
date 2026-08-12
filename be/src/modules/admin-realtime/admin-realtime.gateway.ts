import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectedSocket, OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { parse } from 'cookie';
import type { Server, Socket } from 'socket.io';

import type { Env } from '../../config/env.schema';
import { AuthService } from '../auth/auth.service';
import { ADMIN_CRAWL_PROGRESS_EVENT, type AdminCrawlProgressEvent } from './types/admin-realtime.type';

@WebSocketGateway({ namespace: '/admin' })
export class AdminRealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(AdminRealtimeGateway.name);
  @WebSocketServer() private server!: Server;
  constructor(private readonly auth: AuthService, private readonly config: ConfigService<Env, true>) {}
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const cookies = parse(client.handshake.headers.cookie ?? '');
      const token = cookies[this.config.get('AUTH_COOKIE_NAME', { infer: true })];
      if (!token) return client.disconnect(true);
      const user = await this.auth.verifyAccessToken(token);
      if (user.role !== 'admin') return client.disconnect(true);
      client.data.userId = user.id;
      await client.join('admin:operators');
    } catch (error) {
      this.logger.debug(`Rejected admin socket: ${error instanceof Error ? error.message : String(error)}`);
      client.disconnect(true);
    }
  }
  emitCrawlProgress(event: AdminCrawlProgressEvent) {
    this.server?.to('admin:operators').emit(ADMIN_CRAWL_PROGRESS_EVENT, event);
  }
}
