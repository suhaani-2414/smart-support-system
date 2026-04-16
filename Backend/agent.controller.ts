// agent conroller recieves request for agent and routes request to agent service
//imports common classes fro nextjs common
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
//import agent service from agent.service.ts for controller to send request to
import { AgentService } from './agent.service';
//uses controller class from nestjs to create controller for agent
@Controller('agent')
//makes class for agent controller
export class AgentController {
  //creates constructor for agent controller
  //creates a property for agentservice--finds it and creates an instance here in the controller
  //readonly keyword makes agent service unable to overwrite
  constructor(private readonly agentService: AgentService) {}

  // views unassigned tickets using get command and getUnassigned function
  @Get('tickets/unassigned')
  getUnassigned() {
    //returns unassigned tickets from calling function in agent.service.ts 
    return this.agentService.getUnassignedTickets();
  }

  // views agent's tickets by using get command and getAssigned function
  @Get('tickets/my-work')
  getAssigned(@Query('agentId') agentId: string) {
    //returns assigned tickets from calling function in agent.service.ts 
    return this.agentService.getAssignedTickets(agentId);
  }

  // reply action for agent is created using post command and reply command
  @Post('tickets/:ticketId/reply')
  reply(
    //uses param and body command to create a reply message with a parameter ticketID and body of reply message
    @Param('ticketId') ticketId: string, 
    @Body() replyData: { content: string, agentId: string }
  ) {
    //returns reply to tickets from calling function in agent.service.ts 
    return this.agentService.replyToTicket(ticketId, replyData);
  }
}