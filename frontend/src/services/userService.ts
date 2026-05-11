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
  isPending: boolean;
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
    isPending: user.isPending,
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

/** Admin: get all accounts awaiting approval */
async function getPendingUsers(): Promise<AuthUser[]> {
  const response = await api.get<BackendUser[]>("/users/pending");
  return response.data.map(mapUser);
}

/**
 * Admin: approve a pending account.
 * Optionally pass a role to change it before activation.
 */
async function approveUser(id: number, role?: UserRole): Promise<AuthUser> {
  const response = await api.post<BackendUser>(`/users/${id}/approve`, {
    ...(role ? { role: toBackendRole(role) } : {}),
  });
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
  getPendingUsers,
  approveUser,
  updateUserStatus,
  updateUserRole,
};