import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { parse } from 'cookie';
import type { Server, Socket } from 'socket.io';

import type { Env } from '../../config/env.schema';
import { AuthService } from '../auth/auth.service';
import {
  RESEARCH_PROGRESS_EVENT,
  type ResearchProgressEvent,
} from './types/research-progress.type';

interface AuthenticatedResearchSocket extends Socket {
  data: {
    userId?: string;
  };
}

@WebSocketGateway({ namespace: '/research' })
export class ResearchProgressGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ResearchProgressGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async handleConnection(
    @ConnectedSocket() client: AuthenticatedResearchSocket,
  ) {
    try {
      const cookies = parse(client.handshake.headers.cookie ?? '');
      const token =
        cookies[this.config.get('AUTH_COOKIE_NAME', { infer: true })];

      if (!token) {
        client.disconnect(true);
        return;
      }

      const user = await this.authService.verifyAccessToken(token);
      client.data.userId = user.id;
      await client.join(this.userRoom(user.id));
    } catch (error) {
      this.logger.debug(
        `Rejected research socket: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.disconnect(true);
    }
  }

  emitToUser(userId: string, event: ResearchProgressEvent) {
    this.server.to(this.userRoom(userId)).emit(RESEARCH_PROGRESS_EVENT, event);
  }

  private userRoom(userId: string) {
    return `research:user:${userId}`;
  }
}
