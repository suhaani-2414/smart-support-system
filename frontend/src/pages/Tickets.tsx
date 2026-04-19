import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TicketCard from "../components/TicketCard";
import { ticketService, type Ticket } from "../services/ticketService";
import { useAuth } from "../hooks/useAuth";

export default function Tickets() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    async function fetchTickets() {
      if (!user) return;

      try {
        const data = await ticketService.getVisibleTickets(user);
        setTickets(data);
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [user]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.includes(searchTerm);

    const matchesStatus =
      statusFilter === "ALL" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Remove CLOSED from filter until backend supports it
  // ...keep the rest of your component UI
}
