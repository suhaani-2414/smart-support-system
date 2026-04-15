import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER' // Default role as per requirements
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Basic Validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // 2. Submit to Backend (Mock for now)
    console.log("Submitting to POST /api/auth/register:", formData);
    
    // Success handling: Auto-login by setting mock role and redirecting
    localStorage.setItem('userRole', formData.role);
    alert(`Account created successfully for ${formData.name}!`);
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="card login-box">
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Create Account</h2>
        
        {error && (
          <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '0.5rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Full Name</label>
            <input 
              className="form-input" 
              placeholder="John Doe" 
              required 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="email@example.com" 
              required 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Minimum 8 characters" 
              required 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Confirm Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Re-type password" 
              required 
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Register As</label>
            <select 
              className="form-input" 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="USER">User (Customer)</option>
              <option value="AGENT">Support Agent</option>
              <option value="ADMIN">System Admin</option>
            </select>
          </div>

          <button type="submit" className="button" style={{ marginTop: '0.5rem' }}>
            Sign Up
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          Already have an account? <Link to="/" style={{ color: '#3b82f6' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}