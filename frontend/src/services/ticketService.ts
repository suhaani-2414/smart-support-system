export interface Ticket {
  id: string;
  subject: string;
  description: string; // Added description
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  assignedAgent: string | null;
}

export interface Message {
  id: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

export interface StatusHistory {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  timestamp: string;
}

export interface NewTicketData {
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
}

// --- MOCK DATA STORAGES ---
// We use simple variables to hold state in memory while the app runs
const mockTickets: Ticket[] = [
  { id: '1021', subject: 'Login not working', description: 'I keep getting a 500 error when trying to log in.', status: 'OPEN', priority: 'HIGH', createdAt: '2026-04-14', assignedAgent: null },
  { id: '1020', subject: 'Payment issue', description: 'My credit card was charged twice for the monthly subscription.', status: 'IN_PROGRESS', priority: 'MEDIUM', createdAt: '2026-04-13', assignedAgent: 'Agent Smith' },
];

const mockMessages: Record<string, Message[]> = {
  '1020': [
    { id: 'm1', senderName: 'Jane Doe', senderRole: 'USER', content: 'Can you please look into this double charge?', timestamp: '2026-04-13 10:00 AM' },
    { id: 'm2', senderName: 'Agent Smith', senderRole: 'AGENT', content: 'Looking into this now. I will process a refund for the duplicate charge.', timestamp: '2026-04-13 10:15 AM' }
  ]
};

const mockHistory: Record<string, StatusHistory[]> = {
  '1020': [
    { id: 'h1', oldStatus: 'OPEN', newStatus: 'IN_PROGRESS', changedBy: 'Agent Smith', timestamp: '2026-04-13 10:14 AM' }
  ]
};

// --- API SERVICE ---
export const ticketService = {
  getMyTickets: async (): Promise<Ticket[]> => {
    await new Promise(resolve => setTimeout(resolve, 300)); 
    return [...mockTickets];
  },

  getTicketById: async (id: string): Promise<Ticket | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockTickets.find(t => t.id === id);
  },

  getTicketMessages: async (id: string): Promise<Message[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockMessages[id] || [];
  },

  getTicketHistory: async (id: string): Promise<StatusHistory[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockHistory[id] || [];
  },

  postMessage: async (ticketId: string, content: string, role: string): Promise<Message> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newMessage: Message = {
      id: Math.random().toString(),
      senderName: role === 'USER' ? 'Current User' : 'Current Agent',
      senderRole: role,
      content,
      timestamp: new Date().toLocaleString()
    };
    if (!mockMessages[ticketId]) mockMessages[ticketId] = [];
    mockMessages[ticketId].push(newMessage);
    return newMessage;
  },

  updateTicketStatus: async (ticketId: string, newStatus: Ticket['status'], changedBy: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const ticket = mockTickets.find(t => t.id === ticketId);
    if (ticket) {
      const oldStatus = ticket.status;
      ticket.status = newStatus;
      
      // Add to history
      if (!mockHistory[ticketId]) mockHistory[ticketId] = [];
      mockHistory[ticketId].push({
        id: Math.random().toString(),
        oldStatus,
        newStatus,
        changedBy,
        timestamp: new Date().toLocaleString()
      });
    }
  },

  createTicket: async (data: NewTicketData): Promise<Ticket> => {
    await new Promise(resolve => setTimeout(resolve, 600)); 
    const newTicket: Ticket = {
      id: Math.floor(1000 + Math.random() * 9000).toString(),
      subject: data.subject,
      description: data.description,
      status: 'OPEN',
      priority: data.priority,
      createdAt: new Date().toISOString().split('T')[0],
      assignedAgent: null,
    };
    mockTickets.unshift(newTicket); // Add to top of list
    return newTicket;
  },

  // AGENT ENDPOINTS
  getAssignedTickets: async (agentName: string): Promise<Ticket[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Filter tickets assigned to this agent
    return mockTickets.filter(t => t.assignedAgent === agentName);
  },

  getUnassignedTickets: async (): Promise<Ticket[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Filter tickets with no assigned agent
    return mockTickets.filter(t => t.assignedAgent === null);
  },

  assignTicketToSelf: async (ticketId: string, agentName: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const ticket = mockTickets.find(t => t.id === ticketId);
    if (ticket) {
      const oldStatus = ticket.status;
      ticket.assignedAgent = agentName;
      ticket.status = 'IN_PROGRESS'; // Automatically update status when accepted
      
      // Log it in history
      if (!mockHistory[ticketId]) mockHistory[ticketId] = [];
      mockHistory[ticketId].push({
        id: Math.random().toString(),
        oldStatus,
        newStatus: 'IN_PROGRESS',
        changedBy: agentName,
        timestamp: new Date().toLocaleString()
      });
    }
  }
};