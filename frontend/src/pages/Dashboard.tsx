import UserDashboard from "./dashboards/UserDashboard";
import AgentDashboard from "./dashboards/AgentDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";
import { useAuth } from "../hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "AGENT") return <AgentDashboard />;

  return <UserDashboard />;
}
