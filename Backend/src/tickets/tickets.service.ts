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
  ) {}

  private buildVisibleTicketQuery(viewer: TicketViewer) {
    const query = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.agent', 'agent')
      .where('1 = 1');

    if (viewer.role === Role.AGENT) {
      query.andWhere('agent.id = :agentId', { agentId: viewer.sub });
    } else if (viewer.role === Role.USER) {
      query.andWhere('user.id = :userId', { userId: viewer.sub });
    }

    return query;
  }

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
      agent: null,
    });

    const savedTicket = await this.ticketRepo.save(ticket);

    await this.historyRepo.save({
      ticket: savedTicket,
      oldStatus: TicketStatus.OPEN,
      newStatus: TicketStatus.OPEN,
    });

    return savedTicket;
  }

  async findAllVisible(
    viewer: TicketViewer,
    filters: TicketListFilters = {},
  ): Promise<Ticket[]> {
    const query = this.buildVisibleTicketQuery(viewer);

    if (filters.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters.unassigned) {
      query.andWhere('agent.id IS NULL');
    }

    query.orderBy('ticket.createdAt', 'DESC');

    return query.getMany();
  }

  async findOneVisible(id: number, viewer: TicketViewer): Promise<Ticket> {
    const ticket = await this.buildVisibleTicketQuery(viewer)
      .andWhere('ticket.id = :id', { id })
      .getOne();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
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

  async assign(
    id: number,
    dto: AssignTicketDto,
    viewer: TicketViewer,
  ): Promise<Ticket> {
    if (viewer.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can assign tickets');
    }

    const ticket = await this.findOneVisible(id, viewer);

    const agent = await this.userRepo.findOne({
      where: { id: dto.agentId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.role !== Role.AGENT) {
      throw new BadRequestException('Assigned user must have AGENT role');
    }

    if (!agent.isActive) {
      throw new BadRequestException('Cannot assign an inactive agent');
    }

    ticket.agent = agent;
    return this.ticketRepo.save(ticket);
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
