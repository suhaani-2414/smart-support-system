import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TicketCard from "../../components/TicketCard";
import { ticketService, type Ticket } from "../../services/ticketService";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../services/api";

type StatusFilter = "ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED";

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([]);
  const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // ── Load both lists ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function fetchAgentData() {
      try {
        setLoading(true);
        setError("");

        // Two separate calls: backend filters /tickets by viewer, so the only
        // way to see the unassigned pool is to explicitly ask for it.
        const [mine, pool] = await Promise.all([
          ticketService.getAllTickets(),
          ticketService.getAllTickets({ unassigned: true }),
        ]);

        setAssignedTickets(mine);
        setUnassignedTickets(pool);
      } catch (err) {
        console.error(err);
        setError(getApiErrorMessage(err, "Failed to load tickets."));
      } finally {
        setLoading(false);
      }
    }

    fetchAgentData();
  }, [user]);

  // ── Search + status filter, applied to both lists ─────────────────────────
  const filterTickets = useMemo(
    () => (list: Ticket[]) => {
      const term = searchTerm.toLowerCase();
      return list.filter((ticket) => {
        const matchesSearch =
          !term ||
          ticket.subject.toLowerCase().includes(term) ||
          ticket.description.toLowerCase().includes(term) ||
          ticket.id.toString().includes(term);

        const matchesStatus =
          statusFilter === "ALL" || ticket.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
    },
    [searchTerm, statusFilter]
  );

  const filteredAssigned = useMemo(
    () => filterTickets(assignedTickets),
    [filterTickets, assignedTickets]
  );

  const filteredUnassigned = useMemo(
    () => filterTickets(unassignedTickets),
    [filterTickets, unassignedTickets]
  );

  // ── Claim handler ─────────────────────────────────────────────────────────
  async function handleClaim(ticket: Ticket) {
    setClaimError("");
    setClaimingId(ticket.id);

    try {
      const claimed = await ticketService.selfAssignTicket(ticket.id);
      // Remove from pool, add to assigned
      setUnassignedTickets((current) => current.filter((t) => t.id !== ticket.id));
      setAssignedTickets((current) => [claimed, ...current]);
    } catch (err) {
      setClaimError(getApiErrorMessage(err, "Failed to claim ticket."));
    } finally {
      setClaimingId(null);
    }
  }

  if (!user) return null;

  return (
    <div>
      <div className="card">
        <h2>Agent Dashboard</h2>
        <p>
          Welcome back, <strong>{user.name}</strong>.
        </p>
        <p>
          Review tickets assigned to you and claim unassigned tickets from the
          pool below.
        </p>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          margin: "1rem 0",
        }}
      >
        <div className="card" style={{ minWidth: "160px" }}>
          <h3>Assigned to Me</h3>
          <p>{assignedTickets.length}</p>
        </div>
        <div className="card" style={{ minWidth: "160px" }}>
          <h3>Unassigned Pool</h3>
          <p>{unassignedTickets.length}</p>
        </div>
        <div className="card" style={{ minWidth: "160px" }}>
          <h3>Total Visible</h3>
          <p>{assignedTickets.length + unassignedTickets.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}
      >
        <input
          type="text"
          className="form-input"
          placeholder="Search title, description, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: "1 1 280px" }}
        />
        <select
          className="form-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          style={{ flex: "0 0 200px" }}
        >
          <option value="ALL">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {loading ? (
        <div className="card">
          <p>Loading agent workspace...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ color: "#ef4444" }}>
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Assigned */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>My Assigned Tickets</h3>
            {filteredAssigned.length > 0 ? (
              <div style={{ display: "grid", gap: "1rem" }}>
                {filteredAssigned.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                {assignedTickets.length === 0
                  ? "You have no tickets assigned yet. Claim one from the pool below."
                  : "No assigned tickets match the current filters."}
              </p>
            )}
          </div>

          {/* Unassigned pool */}
          <div className="card" style={{ marginTop: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Unassigned Ticket Pool</h3>
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginTop: 0 }}>
              These tickets have not been assigned to any agent yet. Claim one
              to start working on it.
            </p>

            {claimError && (
              <p style={{ color: "#ef4444", marginBottom: "0.75rem" }}>
                {claimError}
              </p>
            )}

            {filteredUnassigned.length > 0 ? (
              <div style={{ display: "grid", gap: "1rem" }}>
                {filteredUnassigned.map((ticket) => (
                  <div
                    key={ticket.id}
                    style={{
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      padding: "1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
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
                          marginBottom: "0.25rem",
                        }}
                      >
                        #{ticket.id} — {ticket.subject}
                      </button>
                      <p
                        style={{
                          color: "#9ca3af",
                          fontSize: "0.875rem",
                          margin: 0,
                          maxWidth: "560px",
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

                    <button
                      className="button"
                      style={{ background: "#1d4ed8", whiteSpace: "nowrap" }}
                      disabled={claimingId === ticket.id}
                      onClick={() => handleClaim(ticket)}
                    >
                      {claimingId === ticket.id ? "Claiming..." : "Claim Ticket"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                {unassignedTickets.length === 0
                  ? "No tickets are waiting in the pool. Great work!"
                  : "No unassigned tickets match the current filters."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}