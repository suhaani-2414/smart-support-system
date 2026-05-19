import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { MessagesModule } from './messages/messages.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiChatModule } from './ai-chat/ai-chat.module';

/**
 * Root module of the application. Two responsibilities:
 *
 *  1. Configure infrastructure that everyone else depends on:
 *     - ConfigModule (reads .env into a typed ConfigService)
 *     - TypeOrmModule (database connection)
 *
 *  2. Import every feature module. Nest builds a single dependency
 *     graph at startup from this list, so any service can be injected
 *     into any other (provided the source module exports it).
 */
@Module({
  imports: [
    // Make ConfigService available everywhere without re-importing
    // ConfigModule in each feature module. `cache: true` reads each
    // env var once and remembers the value.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // Async because the connection options come from ConfigService,
    // which itself is provided by the ConfigModule above. Nest resolves
    // the dependency order automatically.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USERNAME', 'user'),
        password: config.get<string>('DB_PASSWORD', 'password'),
        database: config.get<string>('DB_NAME', 'support_system'),
        // Pulls in any entity class that's been registered via
        // TypeOrmModule.forFeature([...]) in a feature module. Saves
        // having to maintain a separate entities array here.
        autoLoadEntities: true,
        // Auto-create/alter tables to match entity definitions. Safe
        // in dev, dangerous in prod (can drop columns) — off here when
        // NODE_ENV=production. Long-term, migrations are the right call.
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    // Order matters slightly: MailModule and NotificationsModule are
    // imported by Auth/Users/Tickets, so listing them first keeps the
    // dependency direction clear when reading top-to-bottom.
    MailModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    TicketsModule,
    MessagesModule,
    AiChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}