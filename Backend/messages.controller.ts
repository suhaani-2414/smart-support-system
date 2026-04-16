// agent conroller recieves request for message and routes request to message service
//imports common classes fro nextjs common
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
//import message service from agent.service.ts and create-message.dto.ts for controller to send request to
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './create-message.dto';
//uses controller class from nestjs to create controller for message
@Controller('messages')
//makes class for message controller
export class MessagesController {
   //creates constructor for message controller
  //creates a property for message service--finds it and creates an instance here in the controller
  //readonly keyword makes message service unable to overwrite
  constructor(private readonly messagesService: MessagesService) {}
  // craetes a message object using post command and sendMessage function
  @Post()
  // views unassigned tickets using get command and getUnassigned function
  sendMessage(@Body() createMessageDto: CreateMessageDto) {
     //returns new message from calling function in message.service.ts 
    return this.messagesService.create(createMessageDto);
  }
  // grabs ticketID using get command and finds chat history using getChatHistory command
  @Get(':ticketId')
  getChatHistory(@Param('ticketId') ticketId: string) {
    //returns chat history from calling function in message.service.ts 
    return this.messagesService.findByTicket(ticketId);
  }
}