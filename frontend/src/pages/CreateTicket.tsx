import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService, type NewTicketData } from '../services/ticketService';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // State to hold form data
  const [formData, setFormData] = useState<NewTicketData>({
    subject: '',
    description: '',
    priority: 'LOW',
    category: 'TECHNICAL'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Basic Validation
    if (formData.subject.trim().length < 5) {
      setError('Subject must be at least 5 characters long.');
      return;
    }
    if (formData.description.trim().length < 10) {
      setError('Please provide a more detailed description (minimum 10 characters).');
      return;
    }

    // 2. Submit Data
    try {
      setIsSubmitting(true);
      
      // In Sprint 3, this mock will be replaced by your actual API call
      const newTicket = await ticketService.createTicket(formData);
      
      // 3. Handle Success
      alert(`Ticket #${newTicket.id} created successfully!`);
      navigate('/dashboard/tickets'); // Redirect back to the ticket list
      
    } catch (err) {
      setError('Failed to create ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Create New Ticket</h2>
        <button 
          className="button" 
          style={{ backgroundColor: '#4b5563' }} 
          onClick={() => navigate(-1)} // Go back to previous page
        >
          Cancel
        </button>
      </div>

      <div className="card">
        {error && (
          <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Subject Line */}
          <div>
            <label style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>
              Subject / Brief Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              className="form-input" 
              placeholder="e.g., Cannot access billing page" 
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              required 
            />
          </div>

          {/* Category & Priority Row */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>
                Category
              </label>
              <select 
                className="form-input" 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="TECHNICAL">Technical Support</option>
                <option value="BILLING">Billing & Payments</option>
                <option value="ACCOUNT">Account Management</option>
                <option value="FEATURE">Feature Request</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>
                Priority Level
              </label>
              <select 
                className="form-input" 
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH'})}
              >
                <option value="LOW">Low - General inquiry</option>
                <option value="MEDIUM">Medium - Impairs workflow</option>
                <option value="HIGH">High - Critical issue / System down</option>
              </select>
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <label style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>
              Detailed Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea 
              className="form-input" 
              placeholder="Please describe your issue in as much detail as possible..." 
              rows={6}
              style={{ resize: 'vertical' }} // Allows the user to drag the box taller
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required 
            />
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="button" 
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1, width: '150px' }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}