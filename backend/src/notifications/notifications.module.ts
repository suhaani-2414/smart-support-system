import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MailModule } from '../mail/mail.module';
import { JwtAuthGuard } from '../auth/auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, JwtAuthGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
