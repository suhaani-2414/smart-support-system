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
  /** Returns the server message to show the user after registration */
  register: (payload: RegisterInput) => Promise<string>;
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

  /**
   * Registration creates a pending account — does NOT log the user in.
   * Returns the success message from the server to display in the UI.
   */
  async function register(payload: RegisterInput): Promise<string> {
    const result = await authService.register(payload);
    return result.message;
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