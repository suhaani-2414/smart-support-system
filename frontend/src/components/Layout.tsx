import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const role = user?.role ?? "USER";

  return (
    <>
      <header>
        <h1>Smart Support</h1>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/dashboard/tickets">Tickets</Link>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: "1rem",
              marginLeft: "1rem",
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      <div className="container">
        <aside className="sidebar">
          <h3>Menu</h3>
          <Link to="/dashboard">Home</Link>

          {role === "USER" && (
            <>
              <Link to="/dashboard/tickets">My Tickets</Link>
              <Link to="/dashboard/tickets/new">Create Ticket</Link>
            </>
          )}

          {role === "AGENT" && (
            <>
              <Link to="/dashboard">My Workspace</Link>
              <Link to="/dashboard/tickets">Ticket Queue</Link>
            </>
          )}

          {role === "ADMIN" && (
            <>
              <Link to="/dashboard/tickets">All Tickets</Link>
              {/* Add admin routes later or hide until they exist */}
            </>
          )}
        </aside>

        <main className="main">
          <Outlet />
        </main>
      </div>

      <footer>
        <p>
          2026 Smart Support System | Logged in as: <strong>{role}</strong>
        </p>
      </footer>
    </>
  );
}
