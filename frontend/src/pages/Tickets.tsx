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

export default function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TicketStatus>("ALL");

  useEffect(() => {
    async function fetchTickets() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await ticketService.getVisibleTickets(user);
        setTickets(data);
      } catch (err) {
        setError(
          getApiErrorMessage(
            err,
            "Failed to load tickets. If the error is 404, the backend is still missing GET /api/v1/tickets."
          )
        );
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [user]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            Try adjusting your search or status filter.
          </p>
        </div>
      )}
    </div>
  );
}
