import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function linkStyle({ isActive }: { isActive: boolean }) {
  return {
    color: isActive ? "#60a5fa" : "#e5e7eb",
    textDecoration: "none",
  };
}

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

        <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <NavLink to="/dashboard" style={linkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/dashboard/tickets" style={linkStyle}>
            Tickets
          </NavLink>
          <NavLink to="/dashboard/profile" style={linkStyle}>
            My Profile
          </NavLink>

          {role === "ADMIN" && (
            <>
              <NavLink to="/dashboard/users" style={linkStyle}>
                Manage Users
              </NavLink>
              <NavLink to="/dashboard/settings" style={linkStyle}>
                Settings
              </NavLink>
            </>
          )}

          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      <div className="container">
        <aside className="sidebar">
          <h3>Menu</h3>

          <NavLink to="/dashboard" style={linkStyle}>
            Home
          </NavLink>

          <NavLink to="/dashboard/tickets" style={linkStyle}>
            Tickets
          </NavLink>

          <NavLink to="/dashboard/profile" style={linkStyle}>
            My Profile
          </NavLink>

          {role === "USER" && (
            <NavLink to="/dashboard/tickets/new" style={linkStyle}>
              Create Ticket
            </NavLink>
          )}

          {role === "AGENT" && (
            <NavLink to="/dashboard/agent" style={linkStyle}>
              Agent Workspace
            </NavLink>
          )}

          {role === "ADMIN" && (
            <>
              <NavLink to="/dashboard/admin" style={linkStyle}>
                Admin Overview
              </NavLink>
              <NavLink to="/dashboard/users" style={linkStyle}>
                Manage Users
              </NavLink>
              <NavLink to="/dashboard/settings" style={linkStyle}>
                Settings
              </NavLink>
            </>
          )}

          {user ? (
            <div
              className="card"
              style={{ marginTop: "2rem", padding: "1rem", fontSize: "0.875rem" }}
            >
              <div style={{ fontWeight: 700 }}>{user.name}</div>
              <div style={{ color: "#9ca3af", marginTop: "0.25rem" }}>
                {user.email}
              </div>
              <div style={{ marginTop: "0.75rem", color: "#9ca3af" }}>
                Role: <strong style={{ color: "#e5e7eb" }}>{role}</strong>
              </div>
            </div>
          ) : null}
        </aside>

        <main className="main">
          <Outlet />
        </main>
      </div>

      <footer>
        <p>
          Smart Support System | Logged in as <strong>{role}</strong>
        </p>
      </footer>
    </>
  );
}
