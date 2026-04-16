//imports injectable from nestjs to make message.service.ts a tool to be used by other classes or services
import { Injectable } from '@nestjs/common';
//import message service from messages.entity.ts and create-message.dto.ts for message to use in functions
import { Message } from './messages,entity';
import { CreateMessageDto } from './create-message.dto';

@Injectable()
//creates agent service class
export class MessagesService {
  // creates temporary in-memory storage for message
  private messages: Message[] = []; 
  //creates message body 
  create(createMessageDto: CreateMessageDto) {
    const newMessage: Message = {
      //creates number ID with user as sender role and creates new date for when message was created at
      id: Math.random().toString(36).substr(2, 9),
      ...createMessageDto,
      senderRole: 'user', 
      createdAt: new Date(),
    };
    //pushes new message object
    this.messages.push(newMessage);
    return newMessage;
  }
  // finds message by each ticket using filter command
  findByTicket(ticketId: string) {
    return this.messages.filter(msg => msg.ticketId === ticketId);
  }
}