import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/api";

type LoginRole = "user" | "agent" | "admin";

type LoginFormState = {
  email: string;
  password: string;
};

type RedirectState = {
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
  const env = import.meta.env as Record<string, string | undefined>;

  return {
    email: env[`VITE_DEMO_${role.toUpperCase()}_EMAIL`] ?? "",
    password: env[`VITE_DEMO_${role.toUpperCase()}_PASSWORD`] ?? "",
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = useMemo(() => {
    const state = location.state as RedirectState | null;
    return state?.from?.pathname ?? "/dashboard";
  }, [location.state]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Login failed. Check your credentials and try again."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickLogin(role: LoginRole) {
    const credentials = getDemoCredentials(role);

    if (!credentials.email || !credentials.password) {
      setError(
        `Missing demo credentials for ${roleLabels[role]}. Add VITE_DEMO_${role.toUpperCase()}_EMAIL and VITE_DEMO_${role.toUpperCase()}_PASSWORD to the frontend .env file.`
      );
      return;
    }

    setForm(credentials);
    setSubmitting(true);
    setError("");

    try {
      await login(credentials);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, `Quick login for ${roleLabels[role]} failed.`));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-container">
      <div className="card login-box">
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
          Smart Support Login
        </h2>

        <p style={{ textAlign: "center", color: "#9ca3af", marginBottom: "1.5rem" }}>
          Sign in with your account, or use demo credentials for user, agent, and admin testing.
        </p>

        {error ? (
          <div style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <input
            className="form-input"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            required
          />

          <input
            className="form-input"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            required
          />

          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
          <button
            type="button"
            className="auth-secondary-button"
            onClick={() => handleQuickLogin("user")}
            disabled={submitting}
          >
            Login as User
          </button>
          <button
            type="button"
            className="auth-secondary-button"
            onClick={() => handleQuickLogin("agent")}
            disabled={submitting}
          >
            Login as Agent
          </button>
          <button
            type="button"
            className="auth-secondary-button"
            onClick={() => handleQuickLogin("admin")}
            disabled={submitting}
          >
            Login as Admin
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}