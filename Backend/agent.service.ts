//imports injectable from nestjs to make agent.service.ts a tool to be used by other classes or services
import { Injectable } from '@nestjs/common';

@Injectable()
//creates agent service class
export class AgentService {
  //returns a list of unassigned tickets that need agents
  getUnassignedTickets() {
    return { status: 'Success', data: 'List of unassigned tickets' };
  }
  //returns a list of tickets assigned to an agent
  getAssignedTickets(agentId: string) {
    return { status: 'Success', agentId, data: 'List of your tickets' };
  }
  //creates a reply message from a agent and returns that message
  async replyToTicket(ticketId: string, replyData: { content: string, agentId: string }) {
    //creates message in console
    console.log(`Agent ${replyData.agentId} says: ${replyData.content}`);
    //returns reply message
    return { 
        ticketId, 
        content: replyData.content, 
        agentId: replyData.agentId, 
        timestamp: new Date() 
        };
    } 
}