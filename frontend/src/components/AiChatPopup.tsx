import { useCallback, useEffect, useRef, useState } from "react";
import {
  aiChatService,
  type ChatMessage,
  type ChatSession,
} from "../services/aiChatService";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/api";

interface AiChatPopupProps {
  open: boolean;
  onClose: () => void;
}

const ROLE_HINTS: Record<string, string> = {
  USER: "Ask for help, report a problem, or get pointed to the right place.",
  AGENT:
    "Try: draft a reply to this customer, summarise this ticket, suggest a priority.",
  ADMIN:
    "Try: walk me through assigning multiple agents, draft a policy note, explain the approval flow.",
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toLocaleDateString();
}

export default function AiChatPopup({ open, onClose }: AiChatPopupProps) {
  const { user } = useAuth();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Load session list when the popup first opens ──────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const list = await aiChatService.listSessions();
      setSessions(list);
      return list;
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't load past conversations."));
      return [];
    }
  }, []);

  // Open a specific session (or start a new one if none provided)
  const openSession = useCallback(async (sessionId: number) => {
    try {
      setLoading(true);
      setError("");
      const fresh = await aiChatService.getSession(sessionId);
      setActiveSession(fresh);
      setMessages(fresh.messages ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't load that conversation."));
    } finally {
      setLoading(false);
    }
  }, []);

  const startNewSession = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const fresh = await aiChatService.createSession();
      setActiveSession(fresh);
      setMessages([]);
      // Add to top of session list so user sees it immediately on toggle
      setSessions((current) => [fresh, ...current]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't start a new conversation."));
    } finally {
      setLoading(false);
    }
  }, []);

  // First time the popup opens, fetch existing sessions and either resume
  // the most recent one or create a fresh one if there are none.
  useEffect(() => {
    if (!open || activeSession) return;
    let cancelled = false;

    (async () => {
      const list = await loadSessions();
      if (cancelled) return;
      if (list.length > 0) {
        await openSession(list[0].id);
      } else {
        await startNewSession();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, activeSession, loadSessions, openSession, startNewSession]);

  // Auto-scroll messages to the bottom when they change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || !activeSession || sending) return;

    setInput("");
    setError("");

    // Optimistically render the user message
    const optimistic: ChatMessage = {
      id: -Date.now(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);

    try {
      setSending(true);
      const result = await aiChatService.sendMessage(activeSession.id, content);

      // Replace optimistic message with the real saved pair from the server
      setMessages((current) => [
        ...current.filter((m) => m.id !== optimistic.id),
        result.userMessage,
        result.assistantMessage,
      ]);

      // Reflect any title/updatedAt changes in the session list
      setActiveSession(result.session);
      setSessions((current) => {
        const without = current.filter((s) => s.id !== result.session.id);
        return [result.session, ...without];
      });
    } catch (err) {
      // Roll back the optimistic message; surface a friendly error
      setMessages((current) => current.filter((m) => m.id !== optimistic.id));
      setInput(content);
      setError(getApiErrorMessage(err, "The AI assistant couldn't respond."));
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteSession(sessionId: number) {
    const ok = window.confirm("Delete this conversation? This can't be undone.");
    if (!ok) return;

    try {
      await aiChatService.deleteSession(sessionId);
      setSessions((current) => current.filter((s) => s.id !== sessionId));

      if (activeSession?.id === sessionId) {
        // Active one was deleted — open the next-most-recent, or start fresh
        const next = sessions.find((s) => s.id !== sessionId);
        if (next) {
          await openSession(next.id);
        } else {
          await startNewSession();
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't delete that conversation."));
    }
  }

  if (!open || !user) return null;

  const hint = ROLE_HINTS[user.role] ?? ROLE_HINTS.USER;

  return (
    <div
      role="dialog"
      aria-label="AI support chat"
      style={{
        position: "fixed",
        left: "1rem",
        bottom: "1rem",
        width: "380px",
        maxWidth: "calc(100vw - 2rem)",
        height: "560px",
        maxHeight: "calc(100vh - 2rem)",
        background: "#0f172a",
        border: "1px solid #374151",
        borderRadius: "12px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
        zIndex: 110,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "0.65rem 0.9rem",
          borderBottom: "1px solid #374151",
          background: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, color: "#e5e7eb", fontSize: "0.9rem" }}>
            AI Support Assistant
          </div>
          <div
            style={{
              color: "#9ca3af",
              fontSize: "0.7rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={activeSession?.title}
          >
            {activeSession?.title ?? "New conversation"}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            title="Past conversations"
            style={iconButtonStyle(historyOpen)}
          >
            ☰
          </button>
          <button
            type="button"
            onClick={() => {
              setHistoryOpen(false);
              void startNewSession();
            }}
            title="New conversation"
            style={iconButtonStyle(false)}
          >
            +
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={iconButtonStyle(false)}
          >
            ×
          </button>
        </div>
      </div>

      {/* ── History panel ────────────────────────────────────────────────── */}
      {historyOpen && (
        <div
          style={{
            borderBottom: "1px solid #374151",
            background: "#0b1220",
            maxHeight: "180px",
            overflowY: "auto",
          }}
        >
          {sessions.length === 0 ? (
            <div style={{ padding: "0.75rem 0.9rem", color: "#9ca3af", fontSize: "0.8rem" }}>
              No past conversations yet.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: "0.25rem 0" }}>
              {sessions.map((s) => {
                const isActive = activeSession?.id === s.id;
                return (
                  <li
                    key={s.id}
                    style={{
                      padding: "0.45rem 0.9rem",
                      background: isActive ? "#1e3a5f33" : "transparent",
                      borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryOpen(false);
                        void openSession(s.id);
                      }}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        minWidth: 0,
                        background: "none",
                        border: "none",
                        color: "#e5e7eb",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <div
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.title}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.7rem" }}>
                        {formatSessionDate(s.updatedAt)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s.id)}
                      title="Delete conversation"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#6b7280",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        padding: "0.1rem 0.3rem",
                      }}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.9rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        {loading ? (
          <div style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div
            style={{
              color: "#9ca3af",
              fontSize: "0.85rem",
              lineHeight: 1.5,
              padding: "0.5rem",
              border: "1px dashed #374151",
              borderRadius: "8px",
            }}
          >
            <strong style={{ color: "#e5e7eb" }}>Hi {user.name.split(" ")[0]}!</strong>{" "}
            {hint}
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  background: m.role === "user" ? "#1d4ed8" : "#1f2937",
                  color: "#e5e7eb",
                  padding: "0.5rem 0.7rem",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content}
                <div
                  style={{
                    color: m.role === "user" ? "#cbd5e1" : "#9ca3af",
                    fontSize: "0.65rem",
                    marginTop: "0.25rem",
                    textAlign: "right",
                  }}
                >
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}

        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                background: "#1f2937",
                color: "#9ca3af",
                padding: "0.5rem 0.7rem",
                borderRadius: "10px",
                fontSize: "0.85rem",
                fontStyle: "italic",
              }}
            >
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            padding: "0.5rem 0.9rem",
            background: "#7f1d1d",
            color: "#fecaca",
            fontSize: "0.75rem",
            borderTop: "1px solid #b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        style={{
          borderTop: "1px solid #374151",
          padding: "0.6rem",
          display: "flex",
          gap: "0.4rem",
          background: "#111827",
        }}
      >
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend(e as unknown as React.FormEvent<HTMLFormElement>);
            }
          }}
          placeholder="Type a message... (Shift+Enter for newline)"
          disabled={sending || !activeSession}
          style={{
            flex: 1,
            resize: "none",
            background: "#0b1220",
            color: "#e5e7eb",
            border: "1px solid #374151",
            borderRadius: "6px",
            padding: "0.45rem",
            fontSize: "0.85rem",
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || !activeSession}
          style={{
            background: "#1d4ed8",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "0 0.85rem",
            cursor: sending || !input.trim() ? "default" : "pointer",
            opacity: sending || !input.trim() ? 0.6 : 1,
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function iconButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: "26px",
    height: "26px",
    background: active ? "#1d4ed8" : "transparent",
    border: "1px solid #374151",
    borderRadius: "6px",
    color: "#e5e7eb",
    cursor: "pointer",
    fontSize: "0.9rem",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
