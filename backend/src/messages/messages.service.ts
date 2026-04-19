import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Message } from './messages.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,

    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id: createMessageDto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const sender = await this.usersRepository.findOne({
      where: { id: createMessageDto.senderId },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    const message = this.messagesRepository.create({
      ticket,
      sender,
      senderRole: sender.role,
      content: createMessageDto.content,
    });

    return this.messagesRepository.save(message);
  }

  async findByTicket(ticketId: number): Promise<Message[]> {
    return this.messagesRepository.find({
      where: { ticket: { id: ticketId } },
      relations: ['ticket', 'sender'],
      order: { createdAt: 'ASC' },
    });
  }
}
