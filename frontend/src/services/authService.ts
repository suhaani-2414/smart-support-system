import { api, TOKEN_STORAGE_KEY } from "./api";

export type UserRole = "USER" | "AGENT" | "ADMIN";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

type BackendRole = "user" | "agent" | "admin";

interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: BackendRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface LoginResponse {
  accessToken: string;
}

export function normalizeRole(role: string | undefined): UserRole {
  const value = (role ?? "USER").toUpperCase();
  if (value === "ADMIN" || value === "AGENT") {
    return value;
  }
  return "USER";
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

function setSession(accessToken: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  delete api.defaults.headers.common.Authorization;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function getMe(): Promise<AuthUser> {
  const response = await api.get<BackendUser>("/users/me");
  return mapUser(response.data);
}

export async function login(
  payload: LoginInput
): Promise<{ accessToken: string; user: AuthUser }> {
  const response = await api.post<LoginResponse>("/auth/login", payload);
  setSession(response.data.accessToken);

  const user = await getMe();

  return {
    accessToken: response.data.accessToken,
    user,
  };
}

export async function register(
  payload: RegisterInput
): Promise<{ accessToken: string; user: AuthUser }> {
  await api.post("/auth/signup", payload);

  return login({
    email: payload.email,
    password: payload.password,
  });
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Ignore logout API failures; token is client-side state.
  } finally {
    clearSession();
  }
}

export const authService = {
  login,
  register,
  logout,
  getMe,
  getStoredToken,
  clearSession,
};