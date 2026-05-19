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

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** GET /users/me — any authenticated user can fetch their own profile */
  @Get('me')
  getProfile(@Request() req: { user: { sub: number } }) {
    return this.usersService.findById(req.user.sub);
  }

  /**
   * GET /users/pending — admin only: list all accounts awaiting approval.
   * Must be declared BEFORE :id to avoid route shadowing.
   */
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findPending() {
    return this.usersService.findPendingUsers();
  }

  /**
   * GET /users — admin only: list all users
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /users/:id — admin or agent can view a specific user profile
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  /**
   * POST /users/:id/approve — admin only: approve a pending account.
   * Body (optional): { role: 'user' | 'agent' | 'admin' }
   * Fires an in-app notification + email to the user.
   */
  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async approveAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role?: Role,
  ) {
    const user = await this.usersService.approveAccount(id, role);
    // Fire-and-forget — don't block the response on notification delivery
    void this.notificationsService.notifyAccountApproved(user);
    return user;
  }

  /**
   * PATCH /users/:id/status — admin only: enable or disable an account
   * Body: { isActive: boolean }
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.setAccountStatus(id, isActive);
  }

  /**
   * PATCH /users/:id/role — admin only: promote/demote a user
   * Body: { role: 'user' | 'agent' | 'admin' }
   */
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
