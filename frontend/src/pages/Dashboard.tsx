import UserDashboard from './dashboards/UserDashboard';
import AgentDashboard from './dashboards/AgentDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

export default function Dashboard() {
  // 1. Get the role from storage
  const role = localStorage.getItem('userRole');

  // 2. Strict conditional rendering
  if (role === 'ADMIN') {
    return <AdminDashboard />;
  }
  
  if (role === 'AGENT') {
    return <AgentDashboard />;
  }

  // Default to User for any other case
  return <UserDashboard />;
}