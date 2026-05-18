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
   * Query params:
   *   ?status=OPEN|IN_PROGRESS|RESOLVED   filter by status
   *   ?unassigned=true                    show the unassigned pool
   *   ?archived=true                      admin only — show archive
   *   ?archived=all                       admin only — show active + archive
   */
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: TicketStatus,
    @Query('unassigned') unassigned?: string,
    @Query('archived') archived?: string,
  ) {
    let archivedFilter: boolean | 'all' | undefined;
    if (archived === 'true') archivedFilter = true;
    else if (archived === 'all') archivedFilter = 'all';
    else if (archived === 'false') archivedFilter = false;

    return this.ticketsService.findAllVisible(req.user, {
      status,
      unassigned: unassigned === 'true',
      archived: archivedFilter,
    });
  }

  @Post()
  create(@Body() dto: CreateTicketDto, @Request() req: AuthenticatedRequest) {
    return this.ticketsService.create(dto, req.user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.findOneVisible(id, req.user);
  }

  /**
   * PATCH /tickets/:id
   * Title / description / priority. Permission checked in the service:
   * admin or original requester only.
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.update(id, dto, req.user);
  }

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

  @Patch(':id/claim')
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT)
  claim(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.selfAssign(id, req.user.sub);
  }

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
   * PATCH /tickets/:id/archive — ADMIN only.
   * Soft-archives the ticket (hidden from default lists, reversible).
   */
  @Patch(':id/archive')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  archive(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.archive(id, req.user);
  }

  /**
   * PATCH /tickets/:id/unarchive — ADMIN only.
   * Restores an archived ticket to the active list.
   */
  @Patch(':id/unarchive')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  unarchive(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.unarchive(id, req.user);
  }

  @Get(':id/history')
  getHistory(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.getHistory(id, req.user);
  }
}
