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

/**
 * Minimal shape we need from req.user — the bits filled in by JwtStrategy.
 * Declared inline rather than imported because controllers shouldn't have
 * to know about Passport internals.
 */
type AuthenticatedRequest = {
  user: {
    sub: number;
    role: Role;
  };
};

/**
 * Four endpoints back the notification bell:
 *
 *   GET    /notifications              → bell dropdown content
 *   GET    /notifications/unread-count → badge number (polled every 30s)
 *   PATCH  /notifications/:id/read     → mark one as read (on click)
 *   PATCH  /notifications/read-all     → "Mark all read" button
 *
 * All four require authentication, all four scope to the calling user
 * via req.user.sub — there's no admin-can-see-everyone's-notifications
 * endpoint, by design.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.findForUser(req.user.sub);
  }

  /**
   * Wrapped in an object so the response is `{ count: 3 }` instead of
   * a bare number — gives us room to add other fields (e.g. last poll
   * timestamp) without breaking clients.
   */
  @Get('unread-count')
  async unreadCount(@Request() req: AuthenticatedRequest) {
    const count = await this.notificationsService.getUnreadCount(req.user.sub);
    return { count };
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.markAsRead(id, req.user.sub);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }
}