import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Ticket } from '../tickets/ticket.entity';
import { MessagesService } from './messages.service';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly messagesService: MessagesService,
  ) {}

  async getUnassignedTickets() {
    return this.ticketsRepository.find({
      where: { agent: IsNull() },
      relations: ['user', 'agent'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAssignedTickets(agentId: number) {
    return this.ticketsRepository.find({
      where: { agent: { id: agentId } },
      relations: ['user', 'agent'],
      order: { createdAt: 'DESC' },
    });
  }

  async replyToTicket(
    ticketId: number,
    replyData: { content: string; agentId: number },
  ) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.messagesService.create({
      ticketId,
      senderId: replyData.agentId,
      content: replyData.content,
    });
  }
}
