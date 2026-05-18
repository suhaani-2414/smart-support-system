import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

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
 * Build the TypeORM config from env. Two connection modes are supported:
 *
 * 1. DATABASE_URL — single URL string of the form
 *    `postgres://user:pass@host:5432/dbname`. This is what Render Postgres
 *    (and most managed providers) expose. Preferred when present.
 *
 * 2. Individual DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME —
 *    the original local-dev style. Used when DATABASE_URL is absent.
 *
 * Knobs:
 *
 * - DB_SSL=true → enable SSL with `rejectUnauthorized: false`. Required
 *   when connecting to a managed Postgres over the public internet
 *   (Render's external URL, Neon, Supabase, etc.). Render's INTERNAL URL
 *   from another service in the same region does NOT need SSL, so leave
 *   this off in that case.
 *
 * - DB_SYNCHRONIZE explicitly controls TypeORM's schema sync. If unset,
 *   it defaults to true in dev (NODE_ENV !== 'production') and false in
 *   production. For the FIRST Render deploy you can set
 *   DB_SYNCHRONIZE=true to bootstrap the schema, then flip it to false
 *   once the tables exist.
 */
function buildDbConfig(config: ConfigService): TypeOrmModuleOptions {
  const databaseUrl = config.get<string>('DATABASE_URL');

  const sslFlag = config.get<string>('DB_SSL', 'false') === 'true';
  const ssl = sslFlag ? { rejectUnauthorized: false } : false;

  const synchronizeOverride = config.get<string>('DB_SYNCHRONIZE');
  const synchronize =
    synchronizeOverride !== undefined
      ? synchronizeOverride === 'true'
      : config.get<string>('NODE_ENV') !== 'production';

  const shared = {
    type: 'postgres' as const,
    autoLoadEntities: true,
    synchronize,
    ssl,
  };

  if (databaseUrl) {
    return { ...shared, url: databaseUrl };
  }

  return {
    ...shared,
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number(config.get<string>('DB_PORT', '5432')),
    username: config.get<string>('DB_USERNAME', 'user'),
    password: config.get<string>('DB_PASSWORD', 'password'),
    database: config.get<string>('DB_NAME', 'support_system'),
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildDbConfig,
    }),

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
