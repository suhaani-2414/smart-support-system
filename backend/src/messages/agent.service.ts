import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Ticket, TicketStatus } from '../tickets/ticket.entity';
import { MessagesService } from './messages.service';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * All OPEN tickets with no agents assigned.
   * (For unassigned tickets the multi-agent join issue can't apply, so
   * the simple leftJoin filter is fine.)
   */
  async getUnassignedTickets(): Promise<Ticket[]> {
    return this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.agents', 'agent')
      .where('ticket.status = :status', { status: TicketStatus.OPEN })
      .andWhere('agent.id IS NULL')
      .orderBy('ticket.createdAt', 'DESC')
      .getMany();
  }

  /**
   * All tickets currently assigned to the given agent.
   *
   * Two-step query so the result includes ALL assigned agents per
   * ticket — not just the viewer. (Joining once with
   * `agent.id = :agentId` would discard co-assigned agents.)
   */
  async getAssignedTickets(agentId: number): Promise<Ticket[]> {
    const idRows = await this.ticketsRepository
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .innerJoin('t.agents', 'a')
      .where('a.id = :agentId', { agentId })
      .getRawMany<{ id: number }>();

    const ids = idRows.map((r) => Number(r.id));
    if (ids.length === 0) {
      return [];
    }

    return this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.agents', 'agent')
      .where('ticket.id IN (:...ids)', { ids })
      .orderBy('ticket.createdAt', 'DESC')
      .getMany();
  }

  async getAgentWorkspace(agentId: number): Promise<{
    assigned: Ticket[];
    unassigned: Ticket[];
  }> {
    const [assigned, unassigned] = await Promise.all([
      this.getAssignedTickets(agentId),
      this.getUnassignedTickets(),
    ]);

    return { assigned, unassigned };
  }

  /**
   * Verifies the agent is assigned to this ticket, then creates a message.
   */
  async replyToTicket(
    ticketId: number,
    replyData: { content: string; agentId: number },
  ) {
    const ticket = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .innerJoin('ticket.agents', 'agent', 'agent.id = :agentId', {
        agentId: replyData.agentId,
      })
      .where('ticket.id = :ticketId', { ticketId })
      .getOne();

    if (!ticket) {
      throw new NotFoundException(
        'Ticket not found or agent is not assigned to this ticket',
      );
    }

    return this.messagesService.create({
      ticketId,
      senderId: replyData.agentId,
      content: replyData.content,
    });
  }
}