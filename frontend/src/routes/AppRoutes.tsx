import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Layout from "../components/Layout";
import Dashboard from "../pages/Dashboard";
import Tickets from "../pages/Tickets";
import Login from "../pages/Login";
import Register from "../pages/Register";
import CreateTicket from "../pages/CreateTicket";
import TicketDetail from "../pages/TicketDetail";
import Profile from "../pages/Profile";
import ManageUsers from "../pages/ManageUsers";
import Settings from "../pages/Settings";
import NotFound from "../pages/NotFound";
import UserDashboard from "../pages/dashboards/UserDashboard";
import AgentDashboard from "../pages/dashboards/AgentDashboard";
import AdminDashboard from "../pages/dashboards/AdminDashboard";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: "2rem", color: "#9ca3af" }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        }
      />

      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />

      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="user" element={<UserDashboard />} />
          <Route path="agent" element={<AgentDashboard />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/new" element={<CreateTicket />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
