import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ticketService, type Ticket, type StatusHistory } from "../services/ticketService";
import { messageService, type TicketMessage } from "../services/messageService";
import { getApiErrorMessage } from "../services/api";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [statusUpdate, setStatusUpdate] = useState<Ticket["status"]>("OPEN");

  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        setLoading(true);

        const [ticketData, messageData, historyData] = await Promise.all([
          ticketService.getTicketById(id),
          messageService.getTicketMessages(id),
          ticketService.getTicketHistory(id),
        ]);

        setTicket(ticketData);
        setMessages(messageData);
        setHistory(historyData);
        setStatusUpdate(ticketData.status);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !user || !newMessage.trim()) return;

    try {
      const message = await messageService.sendMessage({
        ticketId: id,
        content: newMessage,
        senderId: user.id,
        senderRole: user.role,
        senderName: user.name,
      });

      setMessages((current) => [...current, message]);
      setNewMessage("");
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to send message."));
    }
  }

  async function handleStatusChange() {
    if (!id) return;

    try {
      const updated = await ticketService.updateTicketStatus(id, statusUpdate);
      const updatedHistory = await ticketService.getTicketHistory(id);

      setTicket(updated);
      setHistory(updatedHistory);
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to update ticket status."));
    }
  }

  // Remove CLOSED from any selects or badge logic.
  // Use OPEN / IN_PROGRESS / RESOLVED only.
}
