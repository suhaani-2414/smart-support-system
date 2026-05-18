import { api } from "./api";

export type NotificationType =
  | "ACCOUNT_CREATED"
  | "ACCOUNT_APPROVED"
  | "TICKET_CREATED"
  | "TICKET_ASSIGNED"
  | "TICKET_CLAIMED"
  | "TICKET_RESOLVED";

interface BackendNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function mapNotification(n: BackendNotification): AppNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    isRead: Boolean(n.isRead),
    createdAt: n.createdAt,
  };
}

async function getNotifications(): Promise<AppNotification[]> {
  const response = await api.get<BackendNotification[]>("/notifications");
  return response.data.map(mapNotification);
}

async function getUnreadCount(): Promise<number> {
  const response = await api.get<{ count: number }>("/notifications/unread-count");
  return response.data.count;
}

async function markAsRead(id: number): Promise<AppNotification> {
  const response = await api.patch<BackendNotification>(
    `/notifications/${id}/read`
  );
  return mapNotification(response.data);
}

async function markAllAsRead(): Promise<{ updated: number }> {
  const response = await api.patch<{ updated: number }>(
    "/notifications/read-all"
  );
  return response.data;
}

export const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
