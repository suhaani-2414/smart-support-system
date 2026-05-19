import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Users module wiring.
 *
 *   - forFeature([User]) registers the User entity so this module can
 *     inject Repository<User> into UsersService.
 *   - MailModule + NotificationsModule are imported because the approval
 *     flow fires emails and in-app notifications.
 *   - exports: [UsersService] lets AuthModule (and anyone else) inject
 *     UsersService into its own providers.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), MailModule, NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService, JwtAuthGuard, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}