import type { UserRole } from "./authService";
import { api } from "./api";

interface BackendMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: "user" | "agent";
  content: string;
  createdAt: string;
}

interface BackendAgentReply {
  ticketId: string;
  content: string;
  agentId: string;
  timestamp: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: "USER" | "AGENT";
  content: string;
  timestamp: string;
}

export interface SendMessageInput {
  ticketId: string;
  content: string;
  senderId: number;
  senderRole: UserRole;
  senderName?: string;
}

function mapMessage(message: BackendMessage): TicketMessage {
  return {
    id: message.id,
    ticketId: message.ticketId,
    senderId: message.senderId,
    senderName: message.senderRole === "agent" ? "Support Agent" : "User",
    senderRole: message.senderRole === "agent" ? "AGENT" : "USER",
    content: message.content,
    timestamp: message.createdAt,
  };
}

function mapAgentReply(reply: BackendAgentReply): TicketMessage {
  return {
    id: `${reply.ticketId}-${reply.timestamp}`,
    ticketId: reply.ticketId,
    senderId: reply.agentId,
    senderName: "Support Agent",
    senderRole: "AGENT",
    content: reply.content,
    timestamp: reply.timestamp,
  };
}

async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const response = await api.get<BackendMessage[]>(`/messages/${ticketId}`);
  return response.data.map(mapMessage);
}

async function sendMessage(input: SendMessageInput): Promise<TicketMessage> {
  if (input.senderRole === "AGENT" || input.senderRole === "ADMIN") {
    // Current backend has a separate agent reply endpoint, but it does not
    // appear to persist into /messages history yet.
    const response = await api.post<BackendAgentReply>(
      `/agent/tickets/${input.ticketId}/reply`,
      {
        content: input.content,
        agentId: String(input.senderId),
      }
    );

    return mapAgentReply(response.data);
  }

  const response = await api.post<BackendMessage>("/messages", {
    ticketId: input.ticketId,
    content: input.content,
    senderId: String(input.senderId),
  });

  return mapMessage(response.data);
}

export const messageService = {
  getTicketMessages,
  sendMessage,
};
