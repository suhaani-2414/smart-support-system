import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { Message } from './messages.entity';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Ticket, User])],
  controllers: [MessagesController, AgentController],
  providers: [MessagesService, AgentService, JwtAuthGuard, RolesGuard],
  exports: [MessagesService, AgentService],
})
export class MessagesModule {}
