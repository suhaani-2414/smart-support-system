import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

  async findAll(): Promise<Ticket[]> {
    return this.ticketRepo.find({
      relations: ['user', 'agent'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['user', 'agent'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async update(id: number, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);

    if (dto.title !== undefined) {
      ticket.title = dto.title;
    }

    if (dto.description !== undefined) {
      ticket.description = dto.description;
    }

    return this.ticketRepo.save(ticket);
  }

  async assign(id: number, dto: AssignTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);

    const agent = await this.userRepo.findOne({
      where: { id: dto.agentId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    ticket.agent = agent;
    return this.ticketRepo.save(ticket);
  }

  async updateStatus(id: number, dto: UpdateTicketStatusDto): Promise<Ticket> {
    const ticket = await this.findOne(id);

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

  async getHistory(ticketId: number): Promise<TicketStatusHistory[]> {
    await this.findOne(ticketId);

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