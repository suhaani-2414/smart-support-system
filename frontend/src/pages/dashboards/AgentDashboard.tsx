import { useEffect, useMemo, useState } from "react";
import TicketCard from "../../components/TicketCard";
import { ticketService, type Ticket } from "../../services/ticketService";
import { useAuth } from "../../hooks/useAuth";

export default function AgentDashboard() {
  const { user } = useAuth();

  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED">("ALL");

  useEffect(() => {
    async function fetchAgentData() {
      if (!user) return;

      try {
        setLoading(true);
        setError("");

        // Use the real backend tickets response only.
        const tickets = await ticketService.getAllTickets();
        setAllTickets(tickets);
      } catch (err) {
        console.error(err);
        setError("Failed to load tickets for the agent dashboard.");
      } finally {
        setLoading(false);
      }
    }

    fetchAgentData();
  }, [user]);

  const assignedTickets = useMemo(() => {
    if (!user) return [];

    return allTickets.filter((ticket) => {
      const agentIdMatches =
        typeof ticket.agentId === "number" && ticket.agentId === user.id;

      const agentNameMatches =
        typeof ticket.assignedAgent === "string" &&
        ticket.assignedAgent.trim().length > 0 &&
        ticket.assignedAgent.toLowerCase() === user.name.toLowerCase();

      return agentIdMatches || agentNameMatches;
    });
  }, [allTickets, user]);

  const unassignedTickets = useMemo(() => {
    return allTickets.filter((ticket) => ticket.agentId === null);
  }, [allTickets]);

  const filteredAssignedTickets = useMemo(() => {
    return assignedTickets.filter((ticket) => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toString().includes(searchTerm);

      const matchesStatus =
        statusFilter === "ALL" || ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assignedTickets, searchTerm, statusFilter]);

  const filteredUnassignedTickets = useMemo(() => {
    return unassignedTickets.filter((ticket) => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toString().includes(searchTerm);

      const matchesStatus =
        statusFilter === "ALL" || ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [unassignedTickets, searchTerm, statusFilter]);

  if (!user) {
    return null;
  }

  return (
    <div>
      <div className="card">
        <h2>Agent Dashboard</h2>
        <p>
          Welcome back, <strong>{user.name}</strong>.
        </p>
        <p>
          Use this workspace to review assigned tickets, claim unassigned tickets, and track current support activity.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          margin: "1rem 0",
        }}
      >
        <div className="card" style={{ minWidth: "180px" }}>
          <h3>Assigned</h3>
          <p>{assignedTickets.length}</p>
        </div>

        <div className="card" style={{ minWidth: "180px" }}>
          <h3>Unassigned</h3>
          <p>{unassignedTickets.length}</p>
        </div>

        <div className="card" style={{ minWidth: "180px" }}>
          <h3>Total Current Tickets</h3>
          <p>{allTickets.length}</p>
        </div>
      </div>

      <div
        className="card"
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <input
          type="text"
          className="form-input"
          placeholder="Search ticket title, description, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: "1 1 280px" }}
        />

        <select
          className="form-input"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as "ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED"
            )
          }
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
          <div className="card">
            <h3>Assigned Tickets</h3>
            {filteredAssignedTickets.length > 0 ? (
              <div style={{ display: "grid", gap: "1rem" }}>
                {filteredAssignedTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            ) : (
              <p>No assigned tickets match the current filters.</p>
            )}
          </div>

          <div className="card" style={{ marginTop: "1rem" }}>
            <h3>Unassigned Tickets</h3>
            {filteredUnassignedTickets.length > 0 ? (
              <div style={{ display: "grid", gap: "1rem" }}>
                {filteredUnassignedTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            ) : (
              <p>No unassigned tickets match the current filters.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}