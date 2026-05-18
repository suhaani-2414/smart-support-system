import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  notificationService,
  type AppNotification,
} from "../services/notificationService";

const POLL_INTERVAL_MS = 30_000;

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return "";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll unread count on mount and at intervals
  const refreshCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silent — auth failure will be handled by the global axios interceptor
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const handle = window.setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [refreshCount]);

  // Load the list when the dropdown is opened
  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const list = await notificationService.getNotifications();
      setItems(list);
    } catch {
      // Ignore — empty dropdown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadList();
    }
  }, [open, loadList]);

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

  async function handleItemClick(item: AppNotification) {
    setOpen(false);
    try {
      if (!item.isRead) {
        await notificationService.markAsRead(item.id);
        setItems((current) =>
          current.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      /* non-fatal */
    }
    if (item.link) {
      navigate(item.link);
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllAsRead();
      setItems((current) => current.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "0.4rem",
          color: "#e5e7eb",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: "16px",
              height: "16px",
              padding: "0 4px",
              borderRadius: "9999px",
              background: "#ef4444",
              color: "#fff",
              fontSize: "0.65rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.4rem)",
            right: 0,
            width: "340px",
            maxHeight: "440px",
            overflowY: "auto",
            background: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #374151",
            }}
          >
            <strong style={{ color: "#e5e7eb" }}>Notifications</strong>
            {items.some((n) => !n.isRead) && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#60a5fa",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: "1rem", color: "#9ca3af", fontSize: "0.875rem" }}>
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "1.25rem", color: "#9ca3af", fontSize: "0.875rem" }}>
              No notifications yet.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map((item) => (
                <li
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid #1f2937",
                    cursor: item.link ? "pointer" : "default",
                    background: item.isRead ? "transparent" : "#1e3a5f33",
                    display: "flex",
                    gap: "0.6rem",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "9999px",
                      background: item.isRead ? "transparent" : "#3b82f6",
                      marginTop: "0.4rem",
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "#e5e7eb",
                        fontWeight: item.isRead ? 400 : 600,
                        fontSize: "0.875rem",
                        marginBottom: "0.15rem",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        color: "#9ca3af",
                        fontSize: "0.8rem",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.body}
                    </div>
                    <div
                      style={{
                        color: "#6b7280",
                        fontSize: "0.7rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {formatRelative(item.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
