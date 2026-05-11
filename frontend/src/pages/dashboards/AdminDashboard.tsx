import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../services/api";
import { userService } from "../../services/userService";
import { ticketService, type Ticket } from "../../services/ticketService";
import type { AuthUser, UserRole } from "../../services/authService";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // ── Pending account approvals ──────────────────────────────────────────────
  const [pendingUsers, setPendingUsers] = useState<AuthUser[]>([]);
  const [pendingRoleDrafts, setPendingRoleDrafts] = useState<
    Record<number, UserRole>
  >({});
  const [pendingBusyId, setPendingBusyId] = useState<number | null>(null);
  const [pendingError, setPendingError] = useState("");
  const [pendingLoading, setPendingLoading] = useState(true);

  // ── Ticket assignment ──────────────────────────────────────────────────────
  const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<AuthUser[]>([]);
  const [agentSelections, setAgentSelections] = useState<
    Record<string, number[]>
  >({});
  const [assignBusyId, setAssignBusyId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState("");
  const [ticketsLoading, setTicketsLoading] = useState(true);

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadPending = useCallback(async () => {
    try {
      setPendingLoading(true);
      setPendingError("");
      const users = await userService.getPendingUsers();
      setPendingUsers(users);
      setPendingRoleDrafts(
        Object.fromEntries(users.map((u) => [u.id, u.role]))
      );
    } catch (err) {
      setPendingError(getApiErrorMessage(err, "Failed to load pending accounts."));
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadAssignmentData = useCallback(async () => {
    try {
      setTicketsLoading(true);
      setAssignError("");

      const [tickets, allUsers] = await Promise.all([
        ticketService.getAllTickets({ unassigned: true }),
        userService.getAllUsers(),
      ]);

      setUnassignedTickets(tickets);
      setAgents(allUsers.filter((u) => u.role === "AGENT" && u.isActive));
    } catch (err) {
      setAssignError(getApiErrorMessage(err, "Failed to load assignment data."));
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
    void loadAssignmentData();
  }, [loadPending, loadAssignmentData]);

  // ── Approval handlers ──────────────────────────────────────────────────────
  async function handleApprove(target: AuthUser) {
    try {
      setPendingBusyId(target.id);
      setPendingError("");
      const chosenRole = pendingRoleDrafts[target.id] ?? target.role;
      await userService.approveUser(target.id, chosenRole);
      setPendingUsers((current) => current.filter((u) => u.id !== target.id));
    } catch (err) {
      setPendingError(getApiErrorMessage(err, "Failed to approve account."));
    } finally {
      setPendingBusyId(null);
    }
  }

  // ── Assignment handlers ────────────────────────────────────────────────────
  function toggleAgent(ticketId: string, agentId: number) {
    setAgentSelections((current) => {
      const existing = current[ticketId] ?? [];
      const next = existing.includes(agentId)
        ? existing.filter((id) => id !== agentId)
        : [...existing, agentId];
      return { ...current, [ticketId]: next };
    });
  }

  async function handleAssign(ticket: Ticket) {
    const selected = agentSelections[ticket.id] ?? [];
    if (selected.length === 0) return;

    try {
      setAssignBusyId(ticket.id);
      setAssignError("");
      await ticketService.assignTicket(ticket.id, selected);

      // Remove from the unassigned list and clear its selection state
      setUnassignedTickets((current) => current.filter((t) => t.id !== ticket.id));
      setAgentSelections((current) => {
        const next = { ...current };
        delete next[ticket.id];
        return next;
      });
    } catch (err) {
      setAssignError(getApiErrorMessage(err, "Failed to assign agent(s)."));
    } finally {
      setAssignBusyId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>System Administration</h2>
        <p style={{ marginBottom: 0, color: "#9ca3af" }}>
          Approve new accounts and assign agents to tickets — directly from here.
        </p>
      </div>

      {/* ── PENDING ACCOUNTS ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <h3 style={{ margin: 0 }}>
            Pending Account Approvals
            {pendingUsers.length > 0 && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  background: "#f59e0b",
                  color: "#000",
                  borderRadius: "9999px",
                  padding: "0.1rem 0.55rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {pendingUsers.length}
              </span>
            )}
          </h3>
          <button
            className="button"
            style={{ background: "#4b5563" }}
            onClick={() => navigate("/dashboard/users")}
          >
            Open Full User Management
          </button>
        </div>

        <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
          New registrations show up here. Change the role if needed, then approve.
        </p>

        {pendingError && (
          <div style={{ color: "#ef4444", marginBottom: "0.75rem" }}>
            {pendingError}
          </div>
        )}

        {pendingLoading ? (
          <p style={{ color: "#9ca3af" }}>Loading pending accounts...</p>
        ) : pendingUsers.length === 0 ? (
          <p style={{ color: "#9ca3af", marginBottom: 0 }}>
            No accounts awaiting approval. 🎉
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Name</th>
                  <th align="left">Email</th>
                  <th align="left">Registered</th>
                  <th align="left">Role on Approval</th>
                  <th align="left">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => {
                  const isBusy = pendingBusyId === u.id;
                  return (
                    <tr key={u.id} style={{ borderTop: "1px solid #374151" }}>
                      <td style={{ padding: "0.75rem 0.5rem 0.75rem 0" }}>
                        {u.name}
                      </td>
                      <td>{u.email}</td>
                      <td style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <select
                          className="form-input"
                          value={pendingRoleDrafts[u.id] ?? "USER"}
                          disabled={isBusy}
                          onChange={(e) =>
                            setPendingRoleDrafts((current) => ({
                              ...current,
                              [u.id]: e.target.value as UserRole,
                            }))
                          }
                        >
                          <option value="USER">USER</option>
                          <option value="AGENT">AGENT</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="button"
                          onClick={() => handleApprove(u)}
                          disabled={isBusy}
                          style={{ background: "#10b981" }}
                        >
                          {isBusy ? "Approving..." : "Approve"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── UNASSIGNED TICKETS ───────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <h3 style={{ margin: 0 }}>
            Assign Agents to Tickets
            {unassignedTickets.length > 0 && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  background: "#1d4ed8",
                  borderRadius: "9999px",
                  padding: "0.1rem 0.55rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {unassignedTickets.length}
              </span>
            )}
          </h3>
          <button
            className="button"
            style={{ background: "#4b5563" }}
            onClick={() => navigate("/dashboard/tickets")}
          >
            View All Tickets
          </button>
        </div>

        <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
          Pick one or more agents per ticket, then click Assign. Selecting
          multiple agents will assign all of them to the same ticket.
        </p>

        {assignError && (
          <div style={{ color: "#ef4444", marginBottom: "0.75rem" }}>
            {assignError}
          </div>
        )}

        {ticketsLoading ? (
          <p style={{ color: "#9ca3af" }}>Loading unassigned tickets...</p>
        ) : agents.length === 0 ? (
          <p style={{ color: "#f59e0b" }}>
            No active agents in the system yet. Approve someone with the AGENT
            role first.
          </p>
        ) : unassignedTickets.length === 0 ? (
          <p style={{ color: "#9ca3af", marginBottom: 0 }}>
            No unassigned tickets right now.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {unassignedTickets.map((ticket) => {
              const selected = agentSelections[ticket.id] ?? [];
              const isBusy = assignBusyId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  style={{
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "1rem",
                    display: "grid",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "260px" }}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/dashboard/tickets/${ticket.id}`)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontWeight: 600,
                          color: "#60a5fa",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        #{ticket.id} — {ticket.subject}
                      </button>
                      <p
                        style={{
                          color: "#9ca3af",
                          fontSize: "0.875rem",
                          margin: "0.35rem 0 0",
                          maxWidth: "640px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ticket.description}
                      </p>
                      <div
                        style={{
                          marginTop: "0.4rem",
                          fontSize: "0.8rem",
                          color: "#6b7280",
                        }}
                      >
                        From {ticket.requesterName} ·{" "}
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Agent picker */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.4rem",
                      padding: "0.5rem",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      background: "#0b1220",
                    }}
                  >
                    {agents.map((agent) => {
                      const isSelected = selected.includes(agent.id);
                      return (
                        <label
                          key={agent.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.25rem 0.6rem",
                            borderRadius: "9999px",
                            cursor: "pointer",
                            background: isSelected ? "#1d4ed8" : "#1f2937",
                            color: "#e5e7eb",
                            fontSize: "0.85rem",
                            border: `1px solid ${
                              isSelected ? "#3b82f6" : "transparent"
                            }`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAgent(ticket.id, agent.id)}
                            style={{ accentColor: "#3b82f6" }}
                          />
                          {agent.name}
                        </label>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="button"
                      onClick={() => handleAssign(ticket)}
                      disabled={isBusy || selected.length === 0}
                      style={{ background: "#10b981" }}
                    >
                      {isBusy
                        ? "Assigning..."
                        : selected.length === 0
                          ? "Select agents to assign"
                          : `Assign ${selected.length} agent${selected.length === 1 ? "" : "s"}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick links ─────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>System Oversight</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
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
            onClick={() => navigate("/dashboard/users")}
          >
            Manage Users
          </button>
          <button
            className="button"
            style={{ backgroundColor: "#4b5563" }}
            onClick={() => navigate("/dashboard/settings")}
          >
            System Settings
          </button>
        </div>
      </div>
    </div>
  );
}