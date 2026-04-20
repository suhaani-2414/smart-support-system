import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="login-container">
      <div className="card login-box">
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Page not found</h2>
        <p style={{ textAlign: "center", color: "#9ca3af", marginBottom: "1.5rem" }}>
          The page you requested does not exist or is not currently routed.
        </p>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link className="button" to={isAuthenticated ? "/dashboard" : "/login"}>
            Go to {isAuthenticated ? "Dashboard" : "Login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
