import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";

type LoginRole = "user" | "agent" | "admin";

type LoginFormState = {
  email: string;
  password: string;
};

type LocationState = {
  from?: {
    pathname?: string;
  };
};

const roleLabels: Record<LoginRole, string> = {
  user: "User",
  agent: "Agent",
  admin: "Admin",
};

function getDemoCredentials(role: LoginRole): LoginFormState {
  return {
    email:
      import.meta.env[`VITE_DEMO_${role.toUpperCase()}_EMAIL` as keyof ImportMetaEnv] ||
      "",
    password:
      import.meta.env[`VITE_DEMO_${role.toUpperCase()}_PASSWORD` as keyof ImportMetaEnv] ||
      "",
  };
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? "/dashboard";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authService.login(form.email.trim(), form.password);
      const me = await authService.getMe(result.accessToken);

      login({
        user: me,
        accessToken: result.accessToken,
      });

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError("Login failed. Check your credentials and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(role: LoginRole) {
    const creds = getDemoCredentials(role);

    if (!creds.email || !creds.password) {
      setError(
        `Missing demo credentials for ${roleLabels[role]}. Add VITE_DEMO_${role.toUpperCase()}_EMAIL and VITE_DEMO_${role.toUpperCase()}_PASSWORD to your frontend .env file.`
      );
      return;
    }

    setForm(creds);

    setLoading(true);
    setError("");

    try {
      const result = await authService.login(creds.email, creds.password);
      const me = await authService.getMe(result.accessToken);

      login({
        user: me,
        accessToken: result.accessToken,
      });

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(`Quick login for ${roleLabels[role]} failed.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Smart Support Login</h1>
        <p className="auth-subtitle">
          Sign in as a user, agent, or admin to test frontend and backend integration.
        </p>

        {error ? <div className="auth-banner">{error}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
              autoComplete="email"
              placeholder="name@example.com"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
          <button
            type="button"
            className="auth-secondary-button"
            onClick={() => handleQuickLogin("user")}
            disabled={loading}
          >
            Login as User
          </button>

          <button
            type="button"
            className="auth-secondary-button"
            onClick={() => handleQuickLogin("agent")}
            disabled={loading}
          >
            Login as Agent
          </button>

          <button
            type="button"
            className="auth-secondary-button"
            onClick={() => handleQuickLogin("admin")}
            disabled={loading}
          >
            Login as Admin
          </button>
        </div>
      </div>
    </div>
  );
}