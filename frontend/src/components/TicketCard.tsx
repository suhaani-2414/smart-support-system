import { Link } from 'react-router-dom';
import type { Ticket } from '../services/ticketService';

interface TicketCardProps {
  ticket: Ticket;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  // Helper to assign correct CSS classes based on values
  const getPriorityClass = (priority: string) => {
    if (priority === 'HIGH') return 'priority-high';
    if (priority === 'MEDIUM') return 'priority-medium';
    return 'status-open'; // Default/Low
  };

  const getStatusClass = (status: string) => {
    if (status === 'OPEN') return 'status-open';
    if (status === 'IN_PROGRESS') return 'status-progress';
    return 'priority-medium'; // Resolved/Closed
  };

  return (
    <div className="ticket-card">
      <div style={{ fontWeight: 'bold', color: '#9ca3af' }}>#{ticket.id}</div>
      
      <div style={{ flex: 1, marginLeft: '1rem' }}>
        {/* The title is now a clickable link to the detail page */}
        <Link 
          to={`/dashboard/tickets/${ticket.id}`} 
          style={{ display: 'block', fontWeight: 'bold', color: '#e5e7eb', textDecoration: 'none', marginBottom: '0.25rem' }}
        >
          {ticket.subject}
        </Link>
        <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          {ticket.assignedAgent ? `Assigned to: ${ticket.assignedAgent}` : 'Unassigned'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span className={`badge ${getPriorityClass(ticket.priority)}`}>
          {ticket.priority}
        </span>
        <span className={`badge ${getStatusClass(ticket.status)}`}>
          {ticket.status.replace('_', ' ')}
        </span>
        <span style={{ fontSize: '0.875rem', color: '#9ca3af', marginLeft: '1rem' }}>
          {ticket.createdAt}
        </span>
      </div>
    </div>
  );
}