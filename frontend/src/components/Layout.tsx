import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import AiChatPopup from "./AiChatPopup";

function linkStyle({ isActive }: { isActive: boolean }) {
  return {
    color: isActive ? "#60a5fa" : "#e5e7eb",
    textDecoration: "none",
  };
}

export default function Layout() {
  const { user } = useAuth();
  const role = user?.role ?? "USER";

  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <header>
        <h1>Smart Support</h1>
        <nav style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <NotificationBell />
          <ProfileMenu />
        </nav>
      </header>

      <div className="container">
        <aside
          className="sidebar"
          style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}
        >
          <h3>Menu</h3>

          <NavLink to="/dashboard" style={linkStyle} end>
            Home
          </NavLink>

          <NavLink to="/dashboard/tickets" style={linkStyle} end>
            Tickets
          </NavLink>

          <NavLink to="/dashboard/profile" style={linkStyle} end>
            My Profile
          </NavLink>

          {role === "USER" && (
            <NavLink to="/dashboard/tickets/new" style={linkStyle} end>
              Create Ticket
            </NavLink>
          )}

          {role === "ADMIN" && (
            <>
              <NavLink to="/dashboard/users" style={linkStyle} end>
                Manage Users
              </NavLink>
              <NavLink to="/dashboard/settings" style={linkStyle} end>
                Settings
              </NavLink>
            </>
          )}

          {user ? (
            <div
              className="card"
              style={{ marginTop: "1.5rem", padding: "1rem", fontSize: "0.875rem" }}
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

          {/* Spacer pushes the AI Support button to the bottom of the sidebar */}
          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            aria-pressed={chatOpen}
            style={{
              marginTop: "1rem",
              background: chatOpen ? "#1d4ed8" : "#1e3a5f",
              border: "1px solid #3b82f6",
              color: "#fff",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 600,
              fontSize: "0.875rem",
              textAlign: "left",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>AI Support Chat</span>
          </button>
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

      <AiChatPopup open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
