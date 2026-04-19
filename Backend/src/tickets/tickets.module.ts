import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from './ticket.entity';
import { TicketStatusHistory } from './ticket-status-history.entity';
import { User } from '../users/user.entity';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketStatusHistory, User])],
  controllers: [TicketsController],
  providers: [TicketsService, JwtAuthGuard, RolesGuard],
  exports: [TicketsService],
})
export class TicketsModule {}
