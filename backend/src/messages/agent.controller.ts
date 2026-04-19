import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/enums/role.enum';

@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT, Role.ADMIN)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('tickets/unassigned')
  getUnassigned() {
    return this.agentService.getUnassignedTickets();
  }

  @Get('tickets/my-work')
  getAssigned(@Query('agentId', ParseIntPipe) agentId: number) {
    return this.agentService.getAssignedTickets(agentId);
  }

  @Post('tickets/:ticketId/reply')
  reply(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() replyData: { content: string; agentId: number },
  ) {
    return this.agentService.replyToTicket(ticketId, replyData);
  }
}
