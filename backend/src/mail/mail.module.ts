import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * MailModule is intentionally minimal — just one service, no controllers
 * or entities. Exporting MailService here lets every other module that
 * imports MailModule inject it without re-declaring the provider.
 *
 * NotificationsService is the primary consumer; it's what other modules
 * actually use, with MailService only as the low-level send mechanism.
 */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}