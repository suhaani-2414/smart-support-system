import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Role } from '../users/enums/role.enum';

type AuthenticatedRequest = {
  user: {
    sub: number;
    role: Role;
  };
};

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** GET /notifications — recent notifications for the calling user. */
  @Get()
  list(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.findForUser(req.user.sub);
  }

  /** GET /notifications/unread-count — used by the bell badge. */
  @Get('unread-count')
  async unreadCount(@Request() req: AuthenticatedRequest) {
    const count = await this.notificationsService.getUnreadCount(req.user.sub);
    return { count };
  }

  /** PATCH /notifications/:id/read — mark a single notification read. */
  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.markAsRead(id, req.user.sub);
  }

  /** PATCH /notifications/read-all — mark every unread one read. */
  @Patch('read-all')
  markAllAsRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }
}
