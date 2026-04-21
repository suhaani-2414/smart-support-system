import { useNavigate } from "react-router-dom";

export default function UserDashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <h2>User Portal</h2>
      <p>Manage your support requests and account.</p>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3>My Tickets</h3>
        <button
          className="button"
          style={{ marginBottom: "1rem" }}
          onClick={() => navigate("/dashboard/tickets/new")}
        >
          Create New Ticket
        </button>
        <p style={{ color: "#9ca3af" }}>View and edit your open tickets here.</p>
      </div>

      <div className="card">
        <h3>Active Conversations</h3>
        <button
          className="button"
          style={{ marginBottom: "1rem" }}
          onClick={() => navigate("/dashboard/tickets")}
        >
          View My Tickets
        </button>
        <p style={{ color: "#9ca3af" }}>
          Send and view messages with support agents.
        </p>
      </div>

      <div className="card" style={{ border: "1px solid #ef4444" }}>
        <h3 style={{ color: "#ef4444" }}>Account Settings</h3>
        <button
          className="button"
          style={{ backgroundColor: "#ef4444" }}
          onClick={() => navigate("/dashboard/profile")}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}