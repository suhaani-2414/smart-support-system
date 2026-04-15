import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService, type Ticket, type Message, type StatusHistory } from '../services/ticketService';

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole') || 'USER';

  // State
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState<Ticket['status']>('OPEN');

  // Load Data
  useEffect(() => {
    if (!id) return;
    
    const fetchAllData = async () => {
      try {
        setLoading(true);
        // Fetch all 3 endpoints in parallel for faster loading
        const [ticketData, messageData, historyData] = await Promise.all([
          ticketService.getTicketById(id),
          ticketService.getTicketMessages(id),
          ticketService.getTicketHistory(id)
        ]);
        
        if (ticketData) {
          setTicket(ticketData);
          setStatusUpdate(ticketData.status);
        }
        setMessages(messageData);
        setHistory(historyData);
      } catch (error) {
        console.error("Failed to load ticket details", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  // Handlers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;

    try {
      setIsSending(true);
      const msg = await ticketService.postMessage(id, newMessage, role);
      setMessages([...messages, msg]); // Append new message
      setNewMessage('');
    } catch (error) {
      alert("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async () => {
    if (!id || !ticket) return;
    try {
      await ticketService.updateTicketStatus(id, statusUpdate, role === 'ADMIN' ? 'System Admin' : 'Agent');
      // Refresh ticket and history
      const [updatedTicket, updatedHistory] = await Promise.all([
        ticketService.getTicketById(id),
        ticketService.getTicketHistory(id)
      ]);
      if (updatedTicket) setTicket(updatedTicket);
      setHistory(updatedHistory);
      alert("Status updated!");
    } catch (error) {
      alert("Failed to update status.");
    }
  };

  if (loading) return <p style={{ color: '#9ca3af' }}>Loading ticket details...</p>;
  if (!ticket) return <div className="card"><h2>Ticket not found</h2><button className="button" onClick={() => navigate('/dashboard/tickets')}>Go Back</button></div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: Main Content & Chat */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Ticket Header & Description */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>{ticket.subject} <span style={{ color: '#9ca3af', fontSize: '1rem' }}>#{ticket.id}</span></h2>
            <button className="button" style={{ backgroundColor: '#4b5563', padding: '0.5rem' }} onClick={() => navigate('/dashboard/tickets')}>Back</button>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span className={`badge ${ticket.priority === 'HIGH' ? 'priority-high' : 'priority-medium'}`}>{ticket.priority}</span>
            <span className={`badge ${ticket.status === 'OPEN' ? 'status-open' : 'status-progress'}`}>{ticket.status.replace('_', ' ')}</span>
          </div>

          <p style={{ color: '#d1d5db', lineHeight: '1.6' }}>{ticket.description}</p>
        </div>

        {/* Message Thread */}
        <div className="card">
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>Conversation</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {messages.length === 0 ? (
              <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No messages yet.</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={{
                  alignSelf: msg.senderRole === role ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.senderRole === role ? '#1e3a8a' : '#374151', // Blue for me, Gray for them
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  maxWidth: '80%'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <strong>{msg.senderName} ({msg.senderRole})</strong>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div>{msg.content}</div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #374151', paddingTop: '1.5rem' }}>
            <input 
              className="form-input" 
              style={{ flex: 1 }}
              placeholder="Type a message..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={ticket.status === 'CLOSED'}
            />
            <button type="submit" className="button" disabled={isSending || ticket.status === 'CLOSED'}>
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Meta Info & Status Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Meta Box */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Ticket Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#d1d5db', fontSize: '0.875rem' }}>
            <div><strong style={{ color: '#9ca3af' }}>Created:</strong> {ticket.createdAt}</div>
            <div><strong style={{ color: '#9ca3af' }}>Assigned Agent:</strong> {ticket.assignedAgent || 'Unassigned'}</div>
          </div>
        </div>

        {/* AGENT/ADMIN CONTROLS: Status Updates */}
        {(role === 'AGENT' || role === 'ADMIN') && (
          <div className="card" style={{ border: '1px solid #3b82f6' }}>
            <h3 style={{ marginTop: 0, color: '#3b82f6' }}>Manage Ticket</h3>
            
            <label style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Update Status</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                className="form-input" 
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value as Ticket['status'])}
                style={{ flex: 1 }}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <button className="button" onClick={handleStatusChange} disabled={statusUpdate === ticket.status}>
                Save
              </button>
            </div>

            {role === 'AGENT' && !ticket.assignedAgent && (
              <button className="button" style={{ width: '100%', marginTop: '1rem', backgroundColor: '#10b981' }}>
                Accept & Assign to Me
              </button>
            )}
          </div>
        )}

        {/* Status History Audit Log */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Audit History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ color: '#9ca3af' }}>• Ticket Created ({ticket.createdAt})</div>
            {history.map(record => (
              <div key={record.id} style={{ color: '#d1d5db' }}>
                • Changed to <strong>{record.newStatus}</strong> by {record.changedBy}<br/>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>{record.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}