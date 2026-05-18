import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from './ticket.entity';
import { TicketStatusHistory } from './ticket-status-history.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { User } from '../users/user.entity';
import { Role } from '../users/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';

type TicketViewer = {
  sub: number;
  role: Role;
};

type TicketListFilters = {
  status?: TicketStatus;
  unassigned?: boolean;
  /**
   * Archive visibility (admin-only effect):
   * - undefined / false → only NON-archived tickets (default).
   * - true              → only ARCHIVED tickets.
   * - 'all'             → both.
   * For non-admin viewers we always force the "active only" view.
   */
  archived?: boolean | 'all';
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,

    @InjectRepository(TicketStatusHistory)
    private readonly historyRepo: Repository<TicketStatusHistory>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async findTicketWithRelations(id: number): Promise<Ticket | null> {
    return this.ticketRepo.findOne({
      where: { id },
      relations: ['user', 'agents'],
    });
  }

  /**
   * IDs of tickets where the given agent is currently assigned.
   * Run as a separate query so the main list can still leftJoinAndSelect
   * ALL agents per ticket — not just the viewer.
   */
  private async getTicketIdsAssignedToAgent(agentId: number): Promise<number[]> {
    const rows = await this.ticketRepo
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .innerJoin('t.agents', 'a')
      .where('a.id = :agentId', { agentId })
      .getRawMany<{ id: number }>();

    return rows.map((r) => Number(r.id));
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async create(dto: CreateTicketDto, userId: number): Promise<Ticket> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ticket = this.ticketRepo.create({
      title: dto.title,
      description: dto.description,
      // Persist the user-chosen priority. Entity default (MEDIUM) kicks in
      // only if the caller omitted it.
      priority: dto.priority ?? TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      user,
      agents: [],
    });

    const savedTicket = await this.ticketRepo.save(ticket);

    await this.historyRepo.save({
      ticket: savedTicket,
      oldStatus: TicketStatus.OPEN,
      newStatus: TicketStatus.OPEN,
    });

    // Notify the user their ticket was created (in-app + email)
    void this.notificationsService.notifyTicketCreated(
      user,
      savedTicket.id,
      savedTicket.title,
    );

    return savedTicket;
  }

  async findAllVisible(
    viewer: TicketViewer,
    filters: TicketListFilters = {},
  ): Promise<Ticket[]> {
    // Resolve ID restriction for agents up front
    let restrictToIds: number[] | null = null;

    if (viewer.role === Role.AGENT && !filters.unassigned) {
      restrictToIds = await this.getTicketIdsAssignedToAgent(viewer.sub);
      if (restrictToIds.length === 0) {
        return [];
      }
    }

    const query = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.agents', 'agent');

    if (viewer.role === Role.USER) {
      query.where('user.id = :userId', { userId: viewer.sub });
    } else if (restrictToIds !== null) {
      query.where('ticket.id IN (:...ids)', { ids: restrictToIds });
    }

    if (filters.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters.unassigned) {
      query.andWhere('agent.id IS NULL');
    }

    // Archive filter — only admins can opt-in. Anyone else gets active only.
    const archiveFilter = viewer.role === Role.ADMIN ? filters.archived : false;

    if (archiveFilter === true) {
      query.andWhere('ticket.isArchived = :archived', { archived: true });
    } else if (archiveFilter === 'all') {
      // no filter — include both
    } else {
      query.andWhere('ticket.isArchived = :archived', { archived: false });
    }

    query.orderBy('ticket.createdAt', 'DESC');

    return query.getMany();
  }

  async findOneVisible(id: number, viewer: TicketViewer): Promise<Ticket> {
    const ticket = await this.findTicketWithRelations(id);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Archived tickets are admin-only. Everyone else gets a 404 (don't
    // leak the ticket's existence).
    if (ticket.isArchived && viewer.role !== Role.ADMIN) {
      throw new NotFoundException('Ticket not found');
    }

    if (viewer.role === Role.ADMIN) {
      return ticket;
    }

    if (viewer.role === Role.USER) {
      if (ticket.user.id !== viewer.sub) {
        throw new NotFoundException('Ticket not found');
      }
      return ticket;
    }

    if (viewer.role === Role.AGENT) {
      const isAssigned = ticket.agents.some((a) => a.id === viewer.sub);
      const isUnassigned = ticket.agents.length === 0;
      if (!isAssigned && !isUnassigned) {
        throw new NotFoundException('Ticket not found');
      }
      return ticket;
    }

    throw new NotFoundException('Ticket not found');
  }

  /**
   * Update title / description / priority of a ticket.
   *
   * Permissions:
   * - ADMIN can edit any ticket (including priority).
   * - The requesting USER can edit their own ticket.
   * - AGENT may NOT edit user-authored content — they handle status and
   *   conversation instead.
   *
   * Archived tickets are read-only; admins must unarchive first.
   */
  async update(
    id: number,
    dto: UpdateTicketDto,
    viewer: TicketViewer,
  ): Promise<Ticket> {
    const ticket = await this.findOneVisible(id, viewer);

    if (ticket.isArchived) {
      throw new BadRequestException(
        'This ticket is archived. Unarchive it before making edits.',
      );
    }

    const isAdmin = viewer.role === Role.ADMIN;
    const isRequester = ticket.user.id === viewer.sub;

    if (!isAdmin && !isRequester) {
      throw new ForbiddenException(
        'Only the requester or an admin can edit this ticket',
      );
    }

    if (dto.title !== undefined) {
      ticket.title = dto.title;
    }

    if (dto.description !== undefined) {
      ticket.description = dto.description;
    }

    if (dto.priority !== undefined) {
      ticket.priority = dto.priority;
    }

    return this.ticketRepo.save(ticket);
  }

  async assign(
    id: number,
    dto: AssignTicketDto,
    viewer: TicketViewer,
  ): Promise<Ticket> {
    if (viewer.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can assign tickets');
    }

    const ticket = await this.findTicketWithRelations(id);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.isArchived) {
      throw new BadRequestException(
        'Cannot reassign an archived ticket. Unarchive it first.',
      );
    }

    const validatedAgents: User[] = [];
    const seenIds = new Set<number>();

    for (const agentId of dto.agentIds) {
      if (seenIds.has(agentId)) continue;
      seenIds.add(agentId);

      const agent = await this.userRepo.findOne({ where: { id: agentId } });

      if (!agent) {
        throw new NotFoundException(`No user found with id ${agentId}`);
      }
      if (agent.role !== Role.AGENT) {
        throw new BadRequestException(
          `${agent.name} (id ${agentId}) does not have the AGENT role`,
        );
      }
      if (!agent.isActive) {
        throw new BadRequestException(
          `Agent ${agent.name} (id ${agentId}) is inactive`,
        );
      }

      validatedAgents.push(agent);
    }

    const currentAgentIds = ticket.agents.map((a) => a.id);
    const newAgentIds = validatedAgents.map((a) => a.id);

    await this.ticketRepo
      .createQueryBuilder()
      .relation(Ticket, 'agents')
      .of(ticket.id)
      .addAndRemove(newAgentIds, currentAgentIds);

    // Notify each newly-added agent (skip those who were already on it)
    const previouslyAssigned = new Set(currentAgentIds);
    for (const agent of validatedAgents) {
      if (!previouslyAssigned.has(agent.id)) {
        void this.notificationsService.notifyTicketAssigned(
          agent,
          ticket.id,
          ticket.title,
        );
      }
    }

    const fresh = await this.findTicketWithRelations(id);
    if (!fresh) {
      throw new NotFoundException('Ticket not found');
    }
    return fresh;
  }

  async selfAssign(ticketId: number, agentId: number): Promise<Ticket> {
    const ticket = await this.findTicketWithRelations(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.isArchived) {
      throw new BadRequestException('Cannot claim an archived ticket.');
    }

    if (ticket.agents.length > 0) {
      throw new BadRequestException(
        'This ticket has already been assigned. Contact an admin to reassign it.',
      );
    }

    const agent = await this.userRepo.findOne({ where: { id: agentId } });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    if (agent.role !== Role.AGENT) {
      throw new ForbiddenException('Only agents can self-assign tickets');
    }
    if (!agent.isActive) {
      throw new BadRequestException('Inactive agents cannot claim tickets');
    }

    await this.ticketRepo
      .createQueryBuilder()
      .relation(Ticket, 'agents')
      .of(ticket.id)
      .add(agent.id);

    // Let the requester know their ticket has been picked up
    if (ticket.user) {
      void this.notificationsService.notifyTicketClaimed(
        ticket.user,
        agent.name,
        ticket.id,
        ticket.title,
      );
    }

    const fresh = await this.findTicketWithRelations(ticketId);
    if (!fresh) {
      throw new NotFoundException('Ticket not found');
    }
    return fresh;
  }

  async updateStatus(
    id: number,
    dto: UpdateTicketStatusDto,
    viewer: TicketViewer,
  ): Promise<Ticket> {
    const ticket = await this.findOneVisible(id, viewer);

    if (ticket.isArchived) {
      throw new BadRequestException(
        'Cannot change status on an archived ticket. Unarchive it first.',
      );
    }

    const oldStatus = ticket.status;
    const newStatus = dto.status;

    if (oldStatus === newStatus) {
      throw new BadRequestException('Ticket already has this status');
    }

    ticket.status = newStatus;
    const updatedTicket = await this.ticketRepo.save(ticket);

    await this.historyRepo.save({
      ticket: updatedTicket,
      oldStatus,
      newStatus,
    });

    if (newStatus === TicketStatus.RESOLVED) {
      const fullTicket = await this.findTicketWithRelations(updatedTicket.id);
      if (fullTicket?.user) {
        void this.notificationsService.notifyTicketResolved(
          fullTicket.user,
          fullTicket.id,
          fullTicket.title,
        );
      }
    }

    return updatedTicket;
  }

  /**
   * ADMIN-only: archive a ticket. Hidden from default lists; admins can
   * still see it with ?archived=true. Reversible via unarchive().
   */
  async archive(id: number, viewer: TicketViewer): Promise<Ticket> {
    if (viewer.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can archive tickets');
    }

    const ticket = await this.findTicketWithRelations(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.isArchived) {
      throw new BadRequestException('Ticket is already archived');
    }

    ticket.isArchived = true;
    ticket.archivedAt = new Date();
    return this.ticketRepo.save(ticket);
  }

  /**
   * ADMIN-only: restore an archived ticket so it shows in default lists.
   */
  async unarchive(id: number, viewer: TicketViewer): Promise<Ticket> {
    if (viewer.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can unarchive tickets');
    }

    const ticket = await this.findTicketWithRelations(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.isArchived) {
      throw new BadRequestException('Ticket is not archived');
    }

    ticket.isArchived = false;
    ticket.archivedAt = null;
    return this.ticketRepo.save(ticket);
  }

  async getHistory(
    ticketId: number,
    viewer: TicketViewer,
  ): Promise<TicketStatusHistory[]> {
    await this.findOneVisible(ticketId, viewer);

    return this.historyRepo.find({
      where: {
        ticket: {
          id: ticketId,
        },
      },
      relations: ['ticket'],
      order: { changedAt: 'ASC' },
    });
  }
}
