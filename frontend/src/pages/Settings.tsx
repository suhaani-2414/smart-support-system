import { useAuth } from "../hooks/useAuth";
import { API_BASE_URL } from "../services/api";

export default function Settings() {
  const { user } = useAuth();

  if (user?.role !== "ADMIN") {
    return (
      <div className="card" style={{ border: "1px solid #f59e0b" }}>
        <h2 style={{ marginTop: 0 }}>Access denied</h2>
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>
          Settings is available to ADMIN accounts only.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Settings</h2>
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>
          System configuration and runtime information.
        </p>
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Frontend Runtime</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                API Base URL
              </div>
              <div>{API_BASE_URL}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Workflow Overview</h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.25rem",
              color: "#9ca3af",
              lineHeight: 1.7,
            }}
          >
            <li>New accounts require admin approval before login.</li>
            <li>Admins can override the role at the time of approval.</li>
            <li>
              Tickets can be assigned by an admin (single or multiple agents) or
              claimed by an agent from the unassigned pool.
            </li>
            <li>
              Email notifications fire on account creation, account approval,
              ticket creation, and ticket resolution.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}