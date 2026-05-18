import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TicketCard from "../components/TicketCard";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/api";
import { ticketService, type Ticket, type TicketStatus } from "../services/ticketService";

const statusOptions: Array<"ALL" | TicketStatus> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
];

type ArchiveView = "active" | "archived" | "all";

export default function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TicketStatus>("ALL");
  const [archiveView, setArchiveView] = useState<ArchiveView>("active");

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    async function fetchTickets() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // archiveView only meaningfully changes the result for admins —
        // the server forces "active only" for everyone else.
        const archivedParam: boolean | "all" | undefined =
          archiveView === "archived"
            ? true
            : archiveView === "all"
              ? "all"
              : false;

        const data = await ticketService.getVisibleTickets(user, {
          archived: archivedParam,
        });
        setTickets(data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load tickets."));
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [user, archiveView]);

  const filteredTickets = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch =
        !term ||
        ticket.subject.toLowerCase().includes(term) ||
        ticket.description.toLowerCase().includes(term) ||
        ticket.id.includes(searchTerm);

      const matchesStatus =
        statusFilter === "ALL" || ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, statusFilter]);

  if (!user) {
    return null;
  }

  const titleByRole = {
    USER: "My Tickets",
    AGENT: "Ticket Queue",
    ADMIN: "All Tickets",
  } as const;

  const archiveTabStyle = (view: ArchiveView): React.CSSProperties => ({
    padding: "0.4rem 0.9rem",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    background: archiveView === view ? "#1d4ed8" : "#374151",
    color: "#fff",
    fontWeight: archiveView === view ? 600 : 400,
    fontSize: "0.85rem",
  });

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
            <h2 style={{ marginTop: 0 }}>{titleByRole[user.role]}</h2>
            <p style={{ marginBottom: 0, color: "#9ca3af" }}>
              Search tickets by subject, description, or ticket ID.
            </p>
          </div>

          {user.role === "USER" && (
            <button
              className="button"
              onClick={() => navigate("/dashboard/tickets/new")}
            >
              Create Ticket
            </button>
          )}
        </div>

        {isAdmin && (
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              marginTop: "1rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                color: "#9ca3af",
                fontSize: "0.85rem",
                alignSelf: "center",
                marginRight: "0.25rem",
              }}
            >
              View:
            </span>
            <button
              style={archiveTabStyle("active")}
              onClick={() => setArchiveView("active")}
            >
              Active
            </button>
            <button
              style={archiveTabStyle("archived")}
              onClick={() => setArchiveView("archived")}
            >
              Archived
            </button>
            <button
              style={archiveTabStyle("all")}
              onClick={() => setArchiveView("all")}
            >
              All
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <input
          className="form-input"
          type="text"
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          style={{ flex: "1 1 280px" }}
        />

        <select
          className="form-input"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "ALL" | TicketStatus)
          }
          style={{ flex: "0 0 220px" }}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === "ALL" ? "All statuses" : status.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card">
          <p>Loading tickets...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ border: "1px solid #ef4444", color: "#fecaca" }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="ticket-list">
          {filteredTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>No tickets found</h3>
          <p style={{ color: "#9ca3af", marginBottom: 0 }}>
            {isAdmin && archiveView === "archived"
              ? "No archived tickets."
              : "Try adjusting your search or status filter."}
          </p>
        </div>
      )}
    </div>
  );
}
