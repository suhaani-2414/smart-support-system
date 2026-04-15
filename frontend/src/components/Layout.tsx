import { Link, Outlet, useNavigate } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  // Get role inside the component to stay reactive
  const role = localStorage.getItem('userRole') || 'USER';

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    navigate('/');
  };

  return (
    <>
      <header>
        <h1>Smart Support</h1>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/dashboard/tickets">Tickets</Link>
          <button 
            onClick={handleLogout} 
            style={{ background: 'none', border: 'none', color: '#e5e7eb', cursor: 'pointer', fontSize: '1rem', marginLeft: '1rem' }}
          >
            Logout
          </button>
        </nav>
      </header>

      <div className="container">
        <aside className="sidebar">
          <h3>Menu</h3>
          <Link to="/dashboard">Home</Link>
  
          {/* USER: Standard Views */}
          {role === 'USER' && (
            <>
              <Link to="/dashboard/tickets">My Tickets</Link>
              <Link to="/dashboard/tickets/new">Create Ticket</Link>
            </>
          )}
  
          {/* AGENT: Specialized Workflow Views */}
          {role === 'AGENT' && (
            <>
              <Link to="/dashboard">My Workspace</Link>
              <Link to="/dashboard/tickets">All Tickets</Link>
              {/* This could point to a specific tab or filtered view later */}
              <Link to="/dashboard" style={{ color: '#10b981' }}>Unassigned Queue</Link>
            </>
          )}
  
          {/* ADMIN: Oversight and Config */}
          {role === 'ADMIN' && (
            <>
              <Link to="/dashboard/tickets">All Ticket History</Link>
              <Link to="/dashboard/users">Manage Users</Link>
              <Link to="/dashboard/settings">System Config</Link>
            </>
          )}

          <hr style={{ border: '0', borderTop: '1px solid #374151', margin: '1rem 0' }} />
          <Link to="/dashboard/profile" style={{ fontSize: '0.875rem', color: '#9ca3af' }}>My Profile</Link>
        </aside>

        <main className="main">
          <Outlet /> 
        </main>
      </div>

      <footer>
        <p>© 2026 Smart Support System | Logged in as: <strong>{role}</strong></p>
      </footer>
    </>
  );
}