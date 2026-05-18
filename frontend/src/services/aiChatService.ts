import { api } from "./api";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

interface BackendSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: BackendMessage[];
}

interface BackendMessage {
  id: number;
  role: ChatRole;
  content: string;
  createdAt: string;
}

interface SendMessageResponse {
  session: BackendSession;
  userMessage: BackendMessage;
  assistantMessage: BackendMessage;
}

function mapMessage(m: BackendMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  };
}

function mapSession(s: BackendSession): ChatSession {
  return {
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messages: s.messages?.map(mapMessage),
  };
}

async function listSessions(): Promise<ChatSession[]> {
  const response = await api.get<BackendSession[]>("/ai-chat/sessions");
  return response.data.map(mapSession);
}

async function createSession(): Promise<ChatSession> {
  const response = await api.post<BackendSession>("/ai-chat/sessions");
  return mapSession(response.data);
}

async function getSession(id: number): Promise<ChatSession> {
  const response = await api.get<BackendSession>(`/ai-chat/sessions/${id}`);
  return mapSession(response.data);
}

async function deleteSession(id: number): Promise<void> {
  await api.delete(`/ai-chat/sessions/${id}`);
}

async function sendMessage(
  sessionId: number,
  content: string
): Promise<{
  session: ChatSession;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}> {
  const response = await api.post<SendMessageResponse>(
    `/ai-chat/sessions/${sessionId}/messages`,
    { content }
  );
  return {
    session: mapSession(response.data.session),
    userMessage: mapMessage(response.data.userMessage),
    assistantMessage: mapMessage(response.data.assistantMessage),
  };
}

export const aiChatService = {
  listSessions,
  createSession,
  getSession,
  deleteSession,
  sendMessage,
};
