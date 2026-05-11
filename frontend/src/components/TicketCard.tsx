import { Link } from "react-router-dom";
import type { Ticket } from "../services/ticketService";

interface TicketCardProps {
  ticket: Ticket;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString();
}

function describeAssignment(ticket: Ticket): string {
  if (!ticket.assignedAgents || ticket.assignedAgents.length === 0) {
    return "Unassigned";
  }
  if (ticket.assignedAgents.length === 1) {
    return `Assigned to: ${ticket.assignedAgents[0].name}`;
  }
  return `Assigned to: ${ticket.assignedAgents[0].name} +${ticket.assignedAgents.length - 1} more`;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const priorityClass =
    ticket.priority === "HIGH"
      ? "priority-high"
      : ticket.priority === "MEDIUM"
        ? "priority-medium"
        : "status-open";

  const statusClass =
    ticket.status === "OPEN"
      ? "status-open"
      : ticket.status === "IN_PROGRESS"
        ? "status-progress"
        : "priority-medium";

  return (
    <div className="ticket-card">
      <div style={{ fontWeight: "bold", color: "#9ca3af" }}>#{ticket.id}</div>

      <div style={{ flex: 1, marginLeft: "1rem" }}>
        <Link
          to={`/dashboard/tickets/${ticket.id}`}
          style={{
            display: "block",
            fontWeight: "bold",
            color: "#e5e7eb",
            textDecoration: "none",
            marginBottom: "0.25rem",
          }}
        >
          {ticket.subject}
        </Link>
        <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
          {describeAssignment(ticket)}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span className={`badge ${priorityClass}`}>{ticket.priority}</span>
        <span className={`badge ${statusClass}`}>
          {ticket.status.replace("_", " ")}
        </span>
        <span
          style={{
            fontSize: "0.875rem",
            color: "#9ca3af",
            marginLeft: "1rem",
          }}
        >
          {formatDate(ticket.createdAt)}
        </span>
      </div>
    </div>
  );
}