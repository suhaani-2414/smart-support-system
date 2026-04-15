import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketCard from '../components/TicketCard';
import { ticketService, type Ticket } from '../services/ticketService';

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const navigate = useNavigate();

  // Load data when the page first appears (on mount)
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await ticketService.getMyTickets();
        setTickets(data);
      } catch (error) {
        console.error("Failed to fetch tickets", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Filter logic runs whenever search term, status, or tickets change
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) || ticket.id.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>My Tickets</h2>
        <button className="button" onClick={() => navigate('/dashboard/tickets/new')}>
          + New Ticket
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="toolbar" style={{ display: 'flex', gap: '1rem', background: '#1f2937', padding: '1rem', borderRadius: '8px' }}>
        <input 
          type="text" 
          placeholder="Search subject or ID..." 
          className="form-input"
          style={{ maxWidth: '300px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="form-input" 
          style={{ maxWidth: '200px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Ticket List / Loading State / Empty State */}
      <div className="ticket-list" style={{ marginTop: '1.5rem' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#9ca3af' }}>Loading tickets...</p>
        ) : filteredTickets.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af' }}>No tickets found matching your criteria.</p>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))
        )}
      </div>
    </>
  );
}