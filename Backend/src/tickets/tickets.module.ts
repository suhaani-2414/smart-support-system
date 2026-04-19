import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from './ticket.entity';
import { TicketStatusHistory } from './ticket-status-history.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketStatusHistory, User])],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}