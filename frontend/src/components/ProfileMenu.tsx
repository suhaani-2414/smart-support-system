import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/** Initials from the user's name, e.g. "Jane Doe" → "JD" */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!user) return null;

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  function goProfile() {
    setOpen(false);
    navigate("/dashboard/profile");
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "#374151",
          border: "none",
          width: "36px",
          height: "36px",
          borderRadius: "9999px",
          color: "#e5e7eb",
          fontWeight: 600,
          fontSize: "0.85rem",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {initialsFor(user.name)}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 0.4rem)",
            right: 0,
            minWidth: "220px",
            background: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #374151",
            }}
          >
            <div style={{ fontWeight: 600, color: "#e5e7eb" }}>{user.name}</div>
            <div style={{ color: "#9ca3af", fontSize: "0.8rem" }}>{user.email}</div>
            <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "0.25rem" }}>
              {user.role}
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={goProfile}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.65rem 1rem",
              background: "none",
              border: "none",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#111827")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Profile
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.65rem 1rem",
              background: "none",
              border: "none",
              borderTop: "1px solid #374151",
              color: "#fca5a5",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#111827")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
