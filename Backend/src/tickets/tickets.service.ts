import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
import { TicketStatusHistory } from './ticket-status-history.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { User } from '../users/user.entity';
import { Role } from '../users/enums/role.enum';
import { MailService } from '../mail/mail.service';

type TicketViewer = {
  sub: number;
  role: Role;
};

type TicketListFilters = {
  status?: TicketStatus;
  unassigned?: boolean;
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

    private readonly mailService: MailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Loads a single ticket with its user + agents relations.
   * Used wherever we need the complete graph (assignments, emails, etc.).
   */
  private async findTicketWithRelations(id: number): Promise<Ticket | null> {
    return this.ticketRepo.findOne({
      where: { id },
      relations: ['user', 'agents'],
    });
  }

  /**
   * Resolve the IDs of tickets where the given agent is currently assigned.
   * We do this as a separate query (instead of joining on agent.id = :id) so
   * the main list query can still load ALL assigned agents per ticket — not
   * just the viewer.
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

    // Notify the user their ticket was created (fire-and-forget)
    void this.mailService.sendTicketCreated(
      user.name,
      user.email,
      savedTicket.id,
      savedTicket.title,
    );

    return savedTicket;
  }

  /**
   * List tickets visible to the viewer.
   *
   * Visibility rules:
   * - ADMIN: every ticket.
   * - AGENT: tickets assigned to them. With `unassigned=true`, the
   *   unassigned pool instead (so agents can browse what to claim).
   * - USER: tickets they opened.
   *
   * Multi-agent fix: we resolve the visible ticket IDs in a separate
   * query so the main query can leftJoinAndSelect ALL agents for each
   * ticket (not just the viewer).
   */
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
      // With ManyToMany leftJoin, tickets with no agents produce a single
      // row where agent.id is NULL.
      query.andWhere('agent.id IS NULL');
    }

    query.orderBy('ticket.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Find a single ticket the viewer is allowed to see.
   * Authorisation is done in-code (after loading) so we always return
   * the full agents list, and so agents can preview unassigned tickets.
   */
  async findOneVisible(id: number, viewer: TicketViewer): Promise<Ticket> {
    const ticket = await this.findTicketWithRelations(id);

    if (!ticket) {
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
      // Agents can see their own tickets AND tickets in the unassigned pool
      if (!isAssigned && !isUnassigned) {
        throw new NotFoundException('Ticket not found');
      }
      return ticket;
    }

    throw new NotFoundException('Ticket not found');
  }

  async update(
    id: number,
    dto: UpdateTicketDto,
    viewer: TicketViewer,
  ): Promise<Ticket> {
    const ticket = await this.findOneVisible(id, viewer);

    if (dto.title !== undefined) {
      ticket.title = dto.title;
    }

    if (dto.description !== undefined) {
      ticket.description = dto.description;
    }

    return this.ticketRepo.save(ticket);
  }

  /**
   * ADMIN-only: assign one or multiple agents to a ticket.
   * Replaces any existing assignment with the provided list.
   *
   * We use a relation query builder rather than `entity.agents = [...]; save()`
   * because the latter is unreliable for *updating* ManyToMany relations
   * across TypeORM versions — it works for inserts but not always for diffs.
   */
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

    // Validate every agent before touching the join table
    const validatedAgents: User[] = [];
    const seenIds = new Set<number>();

    for (const agentId of dto.agentIds) {
      if (seenIds.has(agentId)) {
        continue; // de-duplicate silently
      }
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

    // Diff: add new, remove old. Same end-state as `agents = newList`.
    await this.ticketRepo
      .createQueryBuilder()
      .relation(Ticket, 'agents')
      .of(ticket.id)
      .addAndRemove(newAgentIds, currentAgentIds);

    const fresh = await this.findTicketWithRelations(id);
    if (!fresh) {
      throw new NotFoundException('Ticket not found');
    }
    return fresh;
  }

  /**
   * AGENT self-assignment: an agent claims an unassigned ticket.
   * Refuses if the ticket already has any agent assigned.
   */
  async selfAssign(ticketId: number, agentId: number): Promise<Ticket> {
    const ticket = await this.findTicketWithRelations(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
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

    // When a ticket is resolved, notify the original user
    if (newStatus === TicketStatus.RESOLVED) {
      const fullTicket = await this.findTicketWithRelations(updatedTicket.id);
      if (fullTicket?.user) {
        void this.mailService.sendTicketResolved(
          fullTicket.user.name,
          fullTicket.user.email,
          fullTicket.id,
          fullTicket.title,
        );
      }
    }

    return updatedTicket;
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