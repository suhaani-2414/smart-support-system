import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/api";
import { userService } from "../services/userService";
import type { AuthUser, UserRole } from "../services/authService";

export default function ManageUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    async function loadUsers() {
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const allUsers = await userService.getAllUsers();
        setUsers(allUsers);
        setRoleDrafts(
          Object.fromEntries(allUsers.map((entry) => [entry.id, entry.role]))
        );
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load users."));
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [isAdmin]);

  async function handleStatusToggle(target: AuthUser) {
    try {
      setBusyId(target.id);
      const updated = await userService.updateUserStatus(target.id, !target.isActive);
      setUsers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update user status."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleSave(target: AuthUser) {
    const nextRole = roleDrafts[target.id];

    if (!nextRole || nextRole === target.role) {
      return;
    }

    try {
      setBusyId(target.id);
      const updated = await userService.updateUserRole(target.id, nextRole);
      setUsers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update user role."));
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="card" style={{ border: "1px solid #f59e0b" }}>
        <h2 style={{ marginTop: 0 }}>Access denied</h2>
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>
          Manage Users is available to ADMIN accounts only.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Manage Users</h2>
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>
          Update account status and roles using the current admin endpoints.
        </p>
      </div>

      {error ? (
        <div className="card" style={{ border: "1px solid #ef4444", color: "#fecaca" }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card">
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card">
          <p>No users found.</p>
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">ID</th>
                  <th align="left">Name</th>
                  <th align="left">Email</th>
                  <th align="left">Role</th>
                  <th align="left">Status</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => {
                  const isSelf = user?.id === entry.id;
                  const isBusy = busyId === entry.id;

                  return (
                    <tr key={entry.id}>
                      <td style={{ padding: "0.75rem 0" }}>{entry.id}</td>
                      <td>{entry.name}</td>
                      <td>{entry.email}</td>
                      <td>
                        <select
                          className="form-input"
                          value={roleDrafts[entry.id] ?? entry.role}
                          onChange={(event) =>
                            setRoleDrafts((current) => ({
                              ...current,
                              [entry.id]: event.target.value as UserRole,
                            }))
                          }
                          disabled={isBusy || isSelf}
                        >
                          <option value="USER">USER</option>
                          <option value="AGENT">AGENT</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td>{entry.isActive ? "Active" : "Inactive"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            className="button"
                            onClick={() => handleRoleSave(entry)}
                            disabled={isBusy || isSelf || roleDrafts[entry.id] === entry.role}
                          >
                            Save Role
                          </button>
                          <button
                            className="button"
                            onClick={() => handleStatusToggle(entry)}
                            disabled={isBusy || isSelf}
                            style={{
                              backgroundColor: entry.isActive ? "#ef4444" : "#10b981",
                            }}
                          >
                            {entry.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
