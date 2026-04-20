import { useAuth } from "../hooks/useAuth";

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>My Profile</h2>
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>
          Review the account data currently loaded from the authentication session.
        </p>
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Account Details</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Name</div>
              <div>{user.name}</div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Email</div>
              <div>{user.email}</div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Role</div>
              <div>{user.role}</div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Status</div>
              <div>{user.isActive ? "Active" : "Inactive"}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Timestamps</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Created</div>
              <div>{formatDate(user.createdAt)}</div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Last Updated</div>
              <div>{formatDate(user.updatedAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
