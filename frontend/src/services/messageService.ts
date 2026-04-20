import { api } from "./api";
import { normalizeRole, type UserRole } from "./authService";

interface BackendMessage {
  id: number;
  ticket?: {
    id: number;
  } | null;
  sender?: {
    id: number;
    name: string;
    role: string;
  } | null;
  senderRole?: string;
  content: string;
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
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

function mapMessage(
  message: BackendMessage,
  fallbackTicketId: string
): TicketMessage {
  const senderRole = normalizeRole(message.senderRole ?? message.sender?.role);

  return {
    id: String(message.id),
    ticketId: String(message.ticket?.id ?? fallbackTicketId),
    senderId: String(message.sender?.id ?? ""),
    senderName:
      message.sender?.name ??
      (senderRole === "USER" ? "User" : "Support Agent"),
    senderRole,
    content: message.content,
    timestamp: message.createdAt,
  };
}

async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const response = await api.get<BackendMessage[]>(`/messages/${ticketId}`);
  return response.data.map((message) => mapMessage(message, ticketId));
}

async function sendMessage(input: SendMessageInput): Promise<TicketMessage> {
  const response = await api.post<BackendMessage>("/messages", {
    ticketId: Number(input.ticketId),
    senderId: input.senderId,
    content: input.content,
  });

  return mapMessage(response.data, input.ticketId);
}

export const messageService = {
  getTicketMessages,
  sendMessage,
};