import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route: The default landing page is now Login */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes: These are grouped under the /dashboard URL and use the Layout with the sidebar */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tickets" element={<Tickets />} />

          {/* two temporary placeholders for now */}
          <Route path="tickets/new" element={<CreateTicket />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
        </Route>

        {/* Catch-all: If a user types a weird URL, send them back to login */}
        <Route path="*" element={<Navigate to="/" replace />} />

        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;