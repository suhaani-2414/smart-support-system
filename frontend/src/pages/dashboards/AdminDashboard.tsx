import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <h2>System Administration</h2>
      <p>Oversee all system activity and manage personnel.</p>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3>User Management</h3>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <button
            className="button"
            onClick={() => navigate("/dashboard/users")}
          >
            Manage Users
          </button>
        </div>
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>
          Review users, update roles, and manage account status from the user
          management page.
        </p>
      </div>

      <div className="card">
        <h3>System Oversight</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            className="button"
            style={{ backgroundColor: "#4b5563" }}
            onClick={() => navigate("/dashboard/tickets")}
          >
            View All Tickets
          </button>

          <button
            className="button"
            style={{ backgroundColor: "#4b5563" }}
            onClick={() => navigate("/dashboard/settings")}
          >
            View System Settings
          </button>
        </div>
      </div>
    </div>
  );
}