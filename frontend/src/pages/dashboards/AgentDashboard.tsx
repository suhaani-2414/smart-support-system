import { useState, useEffect } from 'react';
import TicketCard from '../../components/TicketCard';
import { ticketService, type Ticket } from '../../services/ticketService';

export default function AgentDashboard() {
  // We use a hardcoded agent name for the mock. In Sprint 3, this comes from your JWT token.
  const currentAgentName = 'Agent Smith'; 

  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([]);
  const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state: 'ASSIGNED' or 'QUEUE'
  const [activeTab, setActiveTab] = useState<'ASSIGNED' | 'QUEUE'>('ASSIGNED');

  const fetchAgentData = async () => {
    setLoading(true);
    try {
      const [assigned, unassigned] = await Promise.all([
        ticketService.getAssignedTickets(currentAgentName),
        ticketService.getUnassignedTickets()
      ]);
      setAssignedTickets(assigned);
      setUnassignedTickets(unassigned);
    } catch (error) {
      console.error("Error fetching agent data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, []);

  // Handle Accept Ticket Workflow
  const handleAcceptTicket = async (ticketId: string) => {
    try {
      await ticketService.assignTicketToSelf(ticketId, currentAgentName);
      alert(`Ticket #${ticketId} accepted successfully!`);
      // Refresh the data so it moves from Queue to Assigned
      fetchAgentData();
      setActiveTab('ASSIGNED'); // Switch user to their assigned tab
    } catch (error) {
      alert("Failed to accept ticket.");
    }
  };

  if (loading) return <p style={{ color: '#9ca3af', padding: '2rem' }}>Loading agent workspace...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Header & Stats Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Agent Workspace</h2>
          <p style={{ color: '#9ca3af', margin: '0.25rem 0 0 0' }}>Welcome back, {currentAgentName}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem', minWidth: '120px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{assignedTickets.length}</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>My Active Tickets</div>
          </div>
          <div className="card" style={{ padding: '1rem', minWidth: '120px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{unassignedTickets.length}</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Unassigned Queue</div>
          </div>
        </div>
      </div>

      {/* 2. Tabs Navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('ASSIGNED')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer',
            color: activeTab === 'ASSIGNED' ? '#3b82f6' : '#9ca3af',
            fontWeight: activeTab === 'ASSIGNED' ? 'bold' : 'normal',
            borderBottom: activeTab === 'ASSIGNED' ? '2px solid #3b82f6' : 'none',
            paddingBottom: '0.5rem'
          }}
        >
          Assigned to Me
        </button>
        <button 
          onClick={() => setActiveTab('QUEUE')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer',
            color: activeTab === 'QUEUE' ? '#10b981' : '#9ca3af',
            fontWeight: activeTab === 'QUEUE' ? 'bold' : 'normal',
            borderBottom: activeTab === 'QUEUE' ? '2px solid #10b981' : 'none',
            paddingBottom: '0.5rem'
          }}
        >
          Ticket Queue ({unassignedTickets.length})
        </button>
      </div>

      {/* 3. Tab Content */}
      <div className="ticket-list">
        {activeTab === 'ASSIGNED' && (
          assignedTickets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#9ca3af' }}>
              You have no assigned tickets. Great job!
            </div>
          ) : (
            assignedTickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )
        )}

        {activeTab === 'QUEUE' && (
          unassignedTickets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#9ca3af' }}>
              The queue is empty.
            </div>
          ) : (
            unassignedTickets.map(ticket => (
              <div key={ticket.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Wrap the TicketCard in a div to give it flex properties alongside the button */}
                <div style={{ flex: 1 }}>
                  <TicketCard ticket={ticket} />
                </div>
                <button 
                  className="button" 
                  style={{ backgroundColor: '#10b981', height: 'fit-content', whiteSpace: 'nowrap' }}
                  onClick={() => handleAcceptTicket(ticket.id)}
                >
                  Accept Ticket
                </button>
              </div>
            ))
          )
        )}
      </div>

    </div>
  );
}