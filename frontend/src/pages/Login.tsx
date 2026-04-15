import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In Sprint 2, this will make a POST request to your NestJS /api/auth/login
    alert("Authentication logic is pending. Use the bypass button for now!");
  };
  const handleMockLogin = (role: string) => {
    // Temporarily store the role in local storage to mock authentication
    localStorage.setItem('userRole', role);
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="card login-box">
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Smart Support</h2>
        
        {/* Placeholder Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block', color: '#9ca3af' }}>Email</label>
            <input type="email" placeholder="agent@example.com" className="form-input" required />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block', color: '#9ca3af' }}>Password</label>
            <input type="password" placeholder="••••••••" className="form-input" required />
          </div>
          <button type="submit" className="button" style={{ marginTop: '0.5rem' }}>Login</button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
          New user? <Link to="/register" style={{ color: '#3b82f6' }}>Create an account</Link>
        </p>

        {/* Development Bypass Section */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
            Select a test role to enter the system:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              className="button" 
              onClick={() => handleMockLogin('USER')}
            >
              Login as User
            </button>
            <button 
              className="button" 
              style={{ backgroundColor: '#10b981' }} 
              onClick={() => handleMockLogin('AGENT')}
            >
              Login as Agent
            </button>
            <button 
              className="button" 
              style={{ backgroundColor: '#8b5cf6' }} 
              onClick={() => handleMockLogin('ADMIN')}
            >
              Login as Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}