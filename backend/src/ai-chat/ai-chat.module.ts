import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiChatService } from './ai-chat.service';
import { AiChatController } from './ai-chat.controller';
import { ChatSession } from './chat-session.entity';
import { ChatMessage } from './chat-message.entity';
import { User } from '../users/user.entity';
import { JwtAuthGuard } from '../auth/auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ChatSession, ChatMessage, User])],
  controllers: [AiChatController],
  providers: [AiChatService, JwtAuthGuard],
  exports: [AiChatService],
})
export class AiChatModule {}
