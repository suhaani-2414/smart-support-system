import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/api";

export default function Register() {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const message = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      // Show the pending-approval message rather than navigating away
      setSuccessMessage(message);
    } catch (err) {
      setError(getApiErrorMessage(err, "Registration failed."));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (successMessage) {
    return (
      <div className="login-container">
        <div className="card login-box" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div>
          <h2 style={{ marginBottom: "0.75rem" }}>Account Created!</h2>
          <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
            {successMessage}
          </p>
          <Link to="/login" className="button" style={{ display: "inline-block" }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="login-container">
      <div className="card login-box">
        <h2 style={{ textAlign: "center", marginBottom: "0.25rem" }}>
          Create Account
        </h2>
        <p style={{ textAlign: "center", color: "#9ca3af", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
          Your account will be reviewed by an admin before you can log in.
        </p>

        {error ? (
          <div style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</div>
        ) : null}

        <form onSubmit={handleRegister} style={{ display: "grid", gap: "1rem" }}>
          <input
            className="form-input"
            type="text"
            placeholder="Full name"
            value={formData.name}
            onChange={(event) =>
              setFormData((current) => ({ ...current, name: event.target.value }))
            }
            required
          />

          <input
            className="form-input"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(event) =>
              setFormData((current) => ({ ...current, email: event.target.value }))
            }
            required
          />

          <input
            className="form-input"
            type="password"
            placeholder="Password (min. 8 characters)"
            value={formData.password}
            onChange={(event) =>
              setFormData((current) => ({ ...current, password: event.target.value }))
            }
            required
          />

          <input
            className="form-input"
            type="password"
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            required
          />

          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}