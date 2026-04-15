export default function AdminDashboard() {
  return (
    <div>
      <h2>System Administration</h2>
      <p>Oversee all system activity and manage personnel.</p>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>User Management</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button className="button">Create User ID</button>
          <button className="button">Search User IDs</button>
          <button className="button" style={{ backgroundColor: '#8b5cf6' }}>Upgrade to Agent/Admin</button>
        </div>
        <button className="button" style={{ backgroundColor: '#ef4444', marginRight: '0.5rem' }}>Delete User</button>
        <button className="button" style={{ backgroundColor: '#ef4444' }}>Deactivate Agent</button>
      </div>

      <div className="card">
        <h3>System Oversight</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="button" style={{ backgroundColor: '#4b5563' }}>View All Tickets</button>
          <button className="button" style={{ backgroundColor: '#4b5563' }}>Audit System Messages</button>
        </div>
      </div>
    </div>
  );
}