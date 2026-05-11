import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/api";
import { messageService, type TicketMessage } from "../services/messageService";
import {
  ticketService,
  type StatusHistory,
  type Ticket,
  type TicketStatus,
} from "../services/ticketService";
import { userService } from "../services/userService";
import type { AuthUser } from "../services/authService";

const statusOptions: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED"];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newMessage, setNewMessage] = useState("");
  const [statusUpdate, setStatusUpdate] = useState<TicketStatus>("OPEN");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [claiming, setClaiming] = useState(false);

  const [agents, setAgents] = useState<AuthUser[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Missing ticket ID.");
      setLoading(false);
      return;
    }

    async function loadTicket() {
      try {
        setLoading(true);
        setError("");

        const [ticketData, messageData, historyData] = await Promise.all([
          ticketService.getTicketById(id!),
          messageService.getTicketMessages(id!),
          ticketService.getTicketHistory(id!),
        ]);

        setTicket(ticketData);
        setMessages(messageData);
        setHistory(historyData);
        setStatusUpdate(ticketData.status);
        setSelectedAgentIds(ticketData.assignedAgents.map((a) => a.id));
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load ticket details."));
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [id]);

  // Load agent list for admin assignment panel
  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    userService
      .getAllUsers()
      .then((all) => setAgents(all.filter((u) => u.role === "AGENT" && u.isActive)))
      .catch(() => {
        /* silently ignore — admin will see the empty state */
      });
  }, [user]);

  /**
   * Mirror of the backend's authorisation rules so we don't render content
   * the user can't actually act on. Agents are allowed to preview unassigned
   * tickets so they can decide whether to claim them.
   */
  const canViewTicket = useMemo(() => {
    if (!ticket || !user) return false;
    if (user.role === "ADMIN") return true;
    if (user.role === "AGENT") {
      const isAssigned = ticket.assignedAgents.some((a) => a.id === user.id);
      const isUnassigned = ticket.assignedAgents.length === 0;
      return isAssigned || isUnassigned;
    }
    return ticket.requesterId === user.id;
  }, [ticket, user]);

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !user || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      const message = await messageService.sendMessage({
        ticketId: id,
        content: newMessage.trim(),
        senderId: user.id,
        senderRole: user.role,
        senderName: user.name,
      });
      setMessages((current) => [...current, message]);
      setNewMessage("");
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to send message."));
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleStatusChange() {
    if (!id) return;

    try {
      setSavingStatus(true);
      const updatedTicket = await ticketService.updateTicketStatus(id, statusUpdate);
      const updatedHistory = await ticketService.getTicketHistory(id);
      setTicket(updatedTicket);
      setHistory(updatedHistory);
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to update ticket status."));
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleClaim() {
    if (!ticket) return;

    try {
      setClaiming(true);
      const updated = await ticketService.selfAssignTicket(ticket.id);
      setTicket(updated);
      setSelectedAgentIds(updated.assignedAgents.map((a) => a.id));
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to claim ticket."));
    } finally {
      setClaiming(false);
    }
  }

  async function handleAdminAssign() {
    if (!ticket || selectedAgentIds.length === 0) return;

    try {
      setAssigning(true);
      const updated = await ticketService.assignTicket(ticket.id, selectedAgentIds);
      setTicket(updated);
      setSelectedAgentIds(updated.assignedAgents.map((a) => a.id));
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to assign agent(s)."));
    } finally {
      setAssigning(false);
    }
  }

  function toggleAgentSelection(agentId: number) {
    setSelectedAgentIds((current) =>
      current.includes(agentId)
        ? current.filter((id) => id !== agentId)
        : [...current, agentId]
    );
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (!user) return null;

  if (loading) {
    return (
      <div className="card">
        <p>Loading ticket...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ border: "1px solid #ef4444", color: "#fecaca" }}>
        <p style={{ marginTop: 0 }}>{error}</p>
        <button className="button" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="card">
        <p>Ticket not found.</p>
      </div>
    );
  }

  if (!canViewTicket) {
    return (
      <div className="card" style={{ border: "1px solid #f59e0b" }}>
        <h2 style={{ marginTop: 0 }}>Access denied</h2>
        <p style={{ color: "#9ca3af" }}>
          You don't have permission to view this ticket.
        </p>
      </div>
    );
  }

  const canUpdateStatus =
    user.role === "ADMIN" ||
    (user.role === "AGENT" &&
      ticket.assignedAgents.some((a) => a.id === user.id));
  const canClaim =
    user.role === "AGENT" && ticket.assignedAgents.length === 0;
  const isAlreadyAssigned =
    user.role === "AGENT" && ticket.assignedAgents.some((a) => a.id === user.id);

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <button
              className="button"
              onClick={() => navigate(-1)}
              style={{ marginBottom: "1rem" }}
            >
              Back
            </button>
            <h2 style={{ margin: 0 }}>Ticket #{ticket.id}</h2>
            <p style={{ color: "#9ca3af", marginBottom: 0 }}>{ticket.subject}</p>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>{ticket.status.replace("_", " ")}</strong>
            </div>
            <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
              Created {formatDate(ticket.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "2fr 1fr" }}>
        {/* Left column */}
        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Description</h3>
            <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
              {ticket.description}
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Conversation</h3>

            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
              {messages.length > 0 ? (
                messages.map((message) => {
                  const isOwnMessage = message.senderId === String(user.id);
                  return (
                    <div
                      key={message.id}
                      style={{
                        background: isOwnMessage ? "#1d4ed8" : "#111827",
                        border: "1px solid #374151",
                        borderRadius: "10px",
                        padding: "0.9rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "1rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <strong>{message.senderName}</strong>
                        <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: "#9ca3af" }}>No messages yet.</p>
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              style={{ display: "grid", gap: "0.75rem" }}
            >
              <textarea
                className="form-input"
                rows={4}
                placeholder="Write a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="button"
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                >
                  {sendingMessage ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Ticket details */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Ticket Details</h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                  Requester
                </div>
                <div>{ticket.requesterName}</div>
              </div>

              <div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                  Assigned Agent(s)
                </div>
                {ticket.assignedAgents.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.35rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {ticket.assignedAgents.map((a) => (
                      <span
                        key={a.id}
                        style={{
                          background: "#1d4ed8",
                          borderRadius: "9999px",
                          padding: "0.15rem 0.6rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#6b7280" }}>Unassigned</div>
                )}
              </div>

              <div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                  Priority
                </div>
                <div>{ticket.priority}</div>
              </div>
            </div>

            {canClaim && (
              <button
                className="button"
                onClick={handleClaim}
                disabled={claiming}
                style={{ marginTop: "1rem", width: "100%" }}
              >
                {claiming ? "Claiming..." : "Claim This Ticket"}
              </button>
            )}

            {isAlreadyAssigned && (
              <p
                style={{
                  marginTop: "0.75rem",
                  color: "#10b981",
                  fontSize: "0.875rem",
                }}
              >
                ✓ You are assigned to this ticket
              </p>
            )}
          </div>

          {/* Admin: assign agent(s) */}
          {user.role === "ADMIN" && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Assign Agent(s)</h3>
              {agents.length === 0 ? (
                <p style={{ color: "#f59e0b", fontSize: "0.875rem", marginBottom: 0 }}>
                  No active agents yet. Approve someone with the AGENT role first.
                </p>
              ) : (
                <>
                  <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                    Select one or more agents. This replaces the current
                    assignment.
                  </p>

                  <div
                    style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      padding: "0.5rem",
                      display: "grid",
                      gap: "0.35rem",
                    }}
                  >
                    {agents.map((agent) => (
                      <label
                        key={agent.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                          padding: "0.3rem 0.4rem",
                          borderRadius: "4px",
                          background: selectedAgentIds.includes(agent.id)
                            ? "#1e3a5f"
                            : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.includes(agent.id)}
                          onChange={() => toggleAgentSelection(agent.id)}
                        />
                        {agent.name}
                      </label>
                    ))}
                  </div>

                  <button
                    className="button"
                    onClick={handleAdminAssign}
                    disabled={assigning || selectedAgentIds.length === 0}
                    style={{ marginTop: "0.75rem", width: "100%" }}
                  >
                    {assigning
                      ? "Assigning..."
                      : selectedAgentIds.length === 0
                        ? "Select agents to assign"
                        : `Assign (${selectedAgentIds.length})`}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Status update */}
          {canUpdateStatus && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Status</h3>
              <select
                className="form-input"
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value as TicketStatus)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>

              <button
                className="button"
                onClick={handleStatusChange}
                disabled={savingStatus || statusUpdate === ticket.status}
                style={{ marginTop: "1rem", width: "100%" }}
              >
                {savingStatus ? "Saving..." : "Update Status"}
              </button>
            </div>
          )}

          {/* Status history */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Status History</h3>
            {history.length > 0 ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      borderLeft: "3px solid #3b82f6",
                      paddingLeft: "0.75rem",
                    }}
                  >
                    <div>
                      {entry.oldStatus} → {entry.newStatus}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                      {formatDate(entry.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                No history yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}