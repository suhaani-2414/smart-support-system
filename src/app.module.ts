import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';

@Module({
  imports: [
    // Load environment variables from .env
    ConfigModule.forRoot({ isGlobal: true }),

    // SQLite database — swap driver/options for PostgreSQL/MySQL in production
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'support_system.db',
      entities: [User],
      // Set synchronize: false and use migrations in production
      synchronize: true,
    }),

    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
