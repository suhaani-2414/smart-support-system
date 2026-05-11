import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/enums/role.enum';

type AuthenticatedRequest = {
  user: {
    sub: number;
    role: Role;
  };
};

@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT, Role.ADMIN)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('tickets/unassigned')
  getUnassigned() {
    return this.agentService.getUnassignedTickets();
  }

  /**
   * Returns tickets assigned to the *caller*. The agent's identity is
   * read from the JWT — never from query/body — so one agent cannot
   * peek at another agent's workload.
   */
  @Get('tickets/my-work')
  getAssigned(@Request() req: AuthenticatedRequest) {
    return this.agentService.getAssignedTickets(req.user.sub);
  }

  /**
   * Reply to a ticket as the calling agent. agentId is derived from the
   * JWT, so the client only sends the message content.
   */
  @Post('tickets/:ticketId/reply')
  reply(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: { content: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.agentService.replyToTicket(ticketId, {
      content: body.content,
      agentId: req.user.sub,
    });
  }
}