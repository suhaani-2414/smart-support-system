import type { AuthUser } from "./authService";
import { api } from "./api";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

interface BackendUserSummary {
  id: number;
  name: string;
  email: string;
}

interface BackendTicket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  user: BackendUserSummary;
  agent: BackendUserSummary | null;
  createdAt: string;
  updatedAt: string;
}

interface BackendStatusHistory {
  id: number;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  assignedAgent: string | null;
  requesterId: number;
  requesterName: string;
  agentId: number | null;
}

export interface StatusHistory {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string | null;
  timestamp: string;
}

export interface NewTicketData {
  subject: string;
  description: string;
  priority: TicketPriority;
  category: string;
}

type TicketListOptions = {
  status?: TicketStatus;
  unassigned?: boolean;
};

function mapTicket(ticket: BackendTicket): Ticket {
  return {
    id: String(ticket.id),
    subject: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: "MEDIUM",
    createdAt: ticket.createdAt,
    assignedAgent: ticket.agent?.name ?? null,
    requesterId: ticket.user.id,
    requesterName: ticket.user.name,
    agentId: ticket.agent?.id ?? null,
  };
}

function mapHistory(history: BackendStatusHistory): StatusHistory {
  return {
    id: String(history.id),
    oldStatus: history.oldStatus,
    newStatus: history.newStatus,
    changedBy: null,
    timestamp: history.changedAt,
  };
}

async function getAllTickets(options: TicketListOptions = {}): Promise<Ticket[]> {
  const response = await api.get<BackendTicket[]>("/tickets", {
    params: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.unassigned !== undefined
        ? { unassigned: String(options.unassigned) }
        : {}),
    },
  });

  return response.data.map(mapTicket);
}

async function getVisibleTickets(
  _viewer: Pick<AuthUser, "id" | "role">,
  options: TicketListOptions = {}
): Promise<Ticket[]> {
  return getAllTickets(options);
}

async function getPendingTickets(): Promise<Ticket[]> {
  return getAllTickets({ status: "OPEN", unassigned: true });
}

async function getTicketById(id: string): Promise<Ticket> {
  const response = await api.get<BackendTicket>(`/tickets/${id}`);
  return mapTicket(response.data);
}

async function createTicket(input: NewTicketData): Promise<Ticket> {
  const payload = {
    title: input.subject,
    description: input.description,
  };

  const response = await api.post<BackendTicket>("/tickets", payload);
  return mapTicket(response.data);
}

async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<Ticket> {
  const response = await api.patch<BackendTicket>(`/tickets/${ticketId}/status`, {
    status,
  });

  return mapTicket(response.data);
}

async function assignTicket(ticketId: string, agentId: number): Promise<Ticket> {
  const response = await api.patch<BackendTicket>(`/tickets/${ticketId}/assign`, {
    agentId,
  });

  return mapTicket(response.data);
}

async function getTicketHistory(ticketId: string): Promise<StatusHistory[]> {
  const response = await api.get<BackendStatusHistory[]>(
    `/tickets/${ticketId}/history`
  );

  return response.data.map(mapHistory);
}

async function getAgentWorkspace(_agentId: number): Promise<{
  assigned: Ticket[];
  unassigned: Ticket[];
}> {
  const assigned = await getAllTickets();

  return {
    assigned,
    unassigned: [],
  };
}

export const ticketService = {
  getAllTickets,
  getVisibleTickets,
  getPendingTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  assignTicket,
  getTicketHistory,
  getAgentWorkspace,
};
