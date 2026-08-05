import { Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notifications.list(request.user.id, query);
  }

  @Patch('read-all')
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notifications.markAllRead(request.user.id);
  }

  @Patch(':id/read')
  markRead(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notifications.markRead(request.user.id, id);
  }
}
