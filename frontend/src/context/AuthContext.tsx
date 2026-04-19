import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authService,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from "../services/authService";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginInput) => Promise<void>;
  register: (payload: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: AuthUser["role"][]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      const token = authService.getStoredToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await authService.getMe();
        setUser(me);
      } catch {
        authService.clearSession();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();

    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  async function login(payload: LoginInput) {
    const result = await authService.login(payload);
    setUser(result.user);
  }

  async function register(payload: RegisterInput) {
    const result = await authService.register(payload);
    setUser(result.user);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      hasRole: (roles) => {
        return Boolean(user && roles.includes(user.role));
      },
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
