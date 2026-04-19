import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { MessagesService } from './messages.service';
import { CreateMessageDto } from "./dto/create-message.dto";
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  sendMessage(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Get(':ticketId')
  getChatHistory(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.messagesService.findByTicket(ticketId);
  }
}
