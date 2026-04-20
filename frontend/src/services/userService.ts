import { api } from "./api";
import {
  normalizeRole,
  type AuthUser,
  type UserRole,
} from "./authService";

interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function mapUser(user: BackendUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toBackendRole(role: UserRole): "user" | "agent" | "admin" {
  return role.toLowerCase() as "user" | "agent" | "admin";
}

async function getAllUsers(): Promise<AuthUser[]> {
  const response = await api.get<BackendUser[]>("/users");
  return response.data.map(mapUser);
}

async function getUserById(id: number): Promise<AuthUser> {
  const response = await api.get<BackendUser>(`/users/${id}`);
  return mapUser(response.data);
}

async function updateUserStatus(
  id: number,
  isActive: boolean
): Promise<AuthUser> {
  const response = await api.patch<BackendUser>(`/users/${id}/status`, {
    isActive,
  });

  return mapUser(response.data);
}

async function updateUserRole(id: number, role: UserRole): Promise<AuthUser> {
  const response = await api.patch<BackendUser>(`/users/${id}/role`, {
    role: toBackendRole(role),
  });

  return mapUser(response.data);
}

export const userService = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
};