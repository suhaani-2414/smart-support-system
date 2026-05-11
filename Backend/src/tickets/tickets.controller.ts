import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';

import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/enums/role.enum';
import { TicketStatus } from './ticket.entity';

type AuthenticatedRequest = {
  user: {
    sub: number;
    role: Role;
  };
};

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * GET /tickets
   * Returns tickets visible to the caller (filtered by role).
   * Supports ?status= and ?unassigned=true query params.
   */
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: TicketStatus,
    @Query('unassigned') unassigned?: string,
  ) {
    return this.ticketsService.findAllVisible(req.user, {
      status,
      unassigned: unassigned === 'true',
    });
  }

  /**
   * POST /tickets
   * Any authenticated user can create a ticket.
   */
  @Post()
  create(@Body() dto: CreateTicketDto, @Request() req: AuthenticatedRequest) {
    return this.ticketsService.create(dto, req.user.sub);
  }

  /**
   * GET /tickets/:id
   */
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.findOneVisible(id, req.user);
  }

  /**
   * PATCH /tickets/:id
   * Update the title/description of a ticket the caller owns or manages.
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.update(id, dto, req.user);
  }

  /**
   * PATCH /tickets/:id/assign — ADMIN only
   * Assign one or multiple agents to a ticket.
   * Body: { agentIds: number[] }
   * Replaces any existing assignment.
   */
  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.assign(id, dto, req.user);
  }

  /**
   * PATCH /tickets/:id/claim — AGENT only
   * Lets an agent self-assign to an unassigned ticket.
   * No body required — agent identity comes from the JWT.
   */
  @Patch(':id/claim')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT)
  claim(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.selfAssign(id, req.user.sub);
  }

  /**
   * PATCH /tickets/:id/status — ADMIN or AGENT only
   * Body: { status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' }
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.updateStatus(id, dto, req.user);
  }

  /**
   * GET /tickets/:id/history
   */
  @Get(':id/history')
  getHistory(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.getHistory(id, req.user);
  }
}