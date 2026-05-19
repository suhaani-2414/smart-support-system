import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from './enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * HTTP layer over UsersService. Every route below the class-level
 * @UseGuards(JwtAuthGuard) requires a valid JWT — the strategy hydrates
 * req.user with { sub, email, role } so handlers can identify the caller.
 *
 * Role-restricted routes additionally apply RolesGuard with @Roles(...).
 * The two guards run in declaration order: JWT first to authenticate,
 * then RolesGuard to authorise.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * GET /users/me — every authenticated user can fetch their own profile.
   * The id comes from the JWT's `sub` claim, not from a URL param, so a
   * user can't ask for someone else's data here.
   */
  @Get('me')
  getProfile(@Request() req: { user: { sub: number } }) {
    return this.usersService.findById(req.user.sub);
  }

  /**
   * GET /users/pending — admin-only queue for approval.
   *
   * Declared BEFORE @Get(':id') because Nest matches routes in order;
   * placing :id first would make /users/pending get caught by it and
   * try to parse "pending" as a number, throwing a 400.
   */
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findPending() {
    return this.usersService.findPendingUsers();
  }

  /** GET /users — admin sees the full roster. */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /users/:id — admins and agents can look up a specific user.
   * (Agents need this when working a ticket so they can see who opened
   * it and contact them through the right channel.)
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  /**
   * POST /users/:id/approve — flips the pending flag and optionally
   * overrides the role. Fires an in-app notification + email to the
   * newly-approved user so they know they can log in now.
   *
   * The notification call is fire-and-forget (`void`) — we don't await
   * it. A slow Resend response shouldn't make the admin's approval
   * action feel sluggish.
   */
  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async approveAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role?: Role,
  ) {
    const user = await this.usersService.approveAccount(id, role);
    void this.notificationsService.notifyAccountApproved(user);
    return user;
  }

  /** PATCH /users/:id/status — enable/disable a previously approved account. */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.setAccountStatus(id, isActive);
  }

  /** PATCH /users/:id/role — change a user's role without re-approving. */
  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: Role,
  ) {
    return this.usersService.updateRole(id, role);
  }
}