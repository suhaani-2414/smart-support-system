import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * AuthModule wires JWT signing + the Passport JWT strategy. The most
 * subtle bit is JwtModule.registerAsync — it's async because the secret
 * comes from ConfigService at startup, which itself is async to load.
 *
 * `exports: [JwtModule, JwtAuthGuard, RolesGuard]` lets any module that
 * imports AuthModule pick up the JWT-signing service and the guards.
 * Most feature modules don't import AuthModule directly — they declare
 * JwtAuthGuard as a local provider since the strategy is set up
 * globally by PassportModule.
 */
@Module({
  imports: [
    UsersModule,
    MailModule,
    NotificationsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // getOrThrow ensures the app fails at boot if JWT_SECRET isn't set,
        // instead of silently signing with `undefined` (which would mean
        // every token has the same signature — a disaster).
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // Default 8 hours of validity. Long enough for a normal workday
          // session, short enough to limit blast radius if a token leaks.
          expiresIn: (configService.get('JWT_EXPIRES_IN') ?? '8h') as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}