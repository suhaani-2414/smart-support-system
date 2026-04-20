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
          This page surfaces the current frontend runtime assumptions until a real
          backend settings/config API exists.
        </p>
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Frontend Runtime</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>API Base URL</div>
              <div>{API_BASE_URL}</div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Session model</div>
              <div>Access token only; re-login on 401</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Known Backend Gaps</h3>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#9ca3af" }}>
            <li>No refresh-token endpoint</li>
            <li>Missing GET /api/v1/tickets collection route</li>
            <li>Ticket visibility is still filtered client-side</li>
            <li>Test agent/admin logins require seeded or promoted users</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
