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
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    async function loadTicket() {
      if (!id) {
        setError("Missing ticket ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [ticketData, messageData, historyData] = await Promise.all([
          ticketService.getTicketById(id),
          messageService.getTicketMessages(id),
          ticketService.getTicketHistory(id),
        ]);

        setTicket(ticketData);
        setMessages(messageData);
        setHistory(historyData);
        setStatusUpdate(ticketData.status);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load ticket details."));
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [id]);

  const canViewTicket = useMemo(() => {
    if (!ticket || !user) {
      return false;
    }

    if (user.role === "ADMIN") {
      return true;
    }

    if (user.role === "AGENT") {
      return ticket.agentId === user.id;
    }

    return ticket.requesterId === user.id;
  }, [ticket, user]);

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id || !user || !newMessage.trim()) {
      return;
    }

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
    if (!id) {
      return;
    }

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

  async function handleAssignToSelf() {
    if (!ticket || !user) {
      return;
    }

    try {
      setAssigning(true);
      const updatedTicket = await ticketService.assignTicket(ticket.id, user.id);
      setTicket(updatedTicket);
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to assign ticket."));
    } finally {
      setAssigning(false);
    }
  }

  if (!user) {
    return null;
  }

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
          This ticket is outside your current frontend visibility rules.
        </p>
      </div>
    );
  }

  const canUpdateStatus = user.role === "AGENT" || user.role === "ADMIN";
  const canAssignToSelf = user.role === "AGENT" && ticket.agentId === null;

  return (
    <div>
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
            <button className="button" onClick={() => navigate(-1)} style={{ marginBottom: "1rem" }}>
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
        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Description</h3>
            <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{ticket.description}</p>
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

            <form onSubmit={handleSendMessage} style={{ display: "grid", gap: "0.75rem" }}>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Write a message..."
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="button" type="submit" disabled={sendingMessage || !newMessage.trim()}>
                  {sendingMessage ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Ticket Details</h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Requester</div>
                <div>{ticket.requesterName}</div>
              </div>
              <div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Assigned Agent</div>
                <div>{ticket.assignedAgent ?? "Unassigned"}</div>
              </div>
              <div>
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Priority</div>
                <div>{ticket.priority}</div>
              </div>
            </div>

            {canAssignToSelf ? (
              <button
                className="button"
                onClick={handleAssignToSelf}
                disabled={assigning}
                style={{ marginTop: "1rem" }}
              >
                {assigning ? "Assigning..." : "Assign to Me"}
              </button>
            ) : null}
          </div>

          {canUpdateStatus ? (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Status</h3>
              <select
                className="form-input"
                value={statusUpdate}
                onChange={(event) => setStatusUpdate(event.target.value as TicketStatus)}
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
                style={{ marginTop: "1rem" }}
              >
                {savingStatus ? "Saving..." : "Update Status"}
              </button>
            </div>
          ) : null}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Status History</h3>
            {history.length > 0 ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {history.map((entry) => (
                  <div key={entry.id} style={{ borderLeft: "3px solid #3b82f6", paddingLeft: "0.75rem" }}>
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
              <p style={{ color: "#9ca3af", marginBottom: 0 }}>No history yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
