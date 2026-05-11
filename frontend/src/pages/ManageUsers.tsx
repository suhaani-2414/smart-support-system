import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/api";
import { userService } from "../services/userService";
import type { AuthUser, UserRole } from "../services/authService";

type Tab = "pending" | "all";

export default function ManageUsers() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [pendingUsers, setPendingUsers] = useState<AuthUser[]>([]);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, UserRole>>({});
  const [pendingRoleDrafts, setPendingRoleDrafts] = useState<Record<number, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    async function loadData() {
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [pending, all] = await Promise.all([
          userService.getPendingUsers(),
          userService.getAllUsers(),
        ]);

        setPendingUsers(pending);
        setAllUsers(all.filter((u) => !u.isPending));

        setPendingRoleDrafts(
          Object.fromEntries(pending.map((u) => [u.id, u.role]))
        );
        setRoleDrafts(
          Object.fromEntries(all.filter((u) => !u.isPending).map((u) => [u.id, u.role]))
        );
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load users."));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isAdmin]);

  async function handleApprove(target: AuthUser) {
    try {
      setBusyId(target.id);
      const chosenRole = pendingRoleDrafts[target.id] ?? target.role;
      const approved = await userService.approveUser(target.id, chosenRole);

      // Move from pending → active list
      setPendingUsers((current) => current.filter((u) => u.id !== target.id));
      setAllUsers((current) => [approved, ...current]);
      setRoleDrafts((current) => ({ ...current, [approved.id]: approved.role }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to approve account."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatusToggle(target: AuthUser) {
    try {
      setBusyId(target.id);
      const updated = await userService.updateUserStatus(target.id, !target.isActive);
      setAllUsers((current) =>
        current.map((u) => (u.id === updated.id ? updated : u))
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update user status."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleSave(target: AuthUser) {
    const nextRole = roleDrafts[target.id];
    if (!nextRole || nextRole === target.role) return;

    try {
      setBusyId(target.id);
      const updated = await userService.updateUserRole(target.id, nextRole);
      setAllUsers((current) =>
        current.map((u) => (u.id === updated.id ? updated : u))
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

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: "0.5rem 1.25rem",
    borderRadius: "6px 6px 0 0",
    border: "none",
    cursor: "pointer",
    fontWeight: activeTab === tab ? 600 : 400,
    background: activeTab === tab ? "#1d4ed8" : "#374151",
    color: "#fff",
  });

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Manage Users</h2>
        <p style={{ color: "#9ca3af", marginBottom: 0 }}>
          Approve pending accounts, update roles, and manage account status.
        </p>
      </div>

      {error ? (
        <div className="card" style={{ border: "1px solid #ef4444", color: "#fecaca" }}>
          {error}
        </div>
      ) : null}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "-1px" }}>
        <button style={tabStyle("pending")} onClick={() => setActiveTab("pending")}>
          Pending Approval
          {pendingUsers.length > 0 && (
            <span
              style={{
                marginLeft: "0.5rem",
                background: "#ef4444",
                borderRadius: "9999px",
                padding: "0.1rem 0.45rem",
                fontSize: "0.75rem",
              }}
            >
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button style={tabStyle("all")} onClick={() => setActiveTab("all")}>
          All Active Users
        </button>
      </div>

      {loading ? (
        <div className="card">
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          {/* ── PENDING TAB ───────────────────────────────────────────────── */}
          {activeTab === "pending" && (
            <div className="card" style={{ borderTop: "2px solid #1d4ed8" }}>
              {pendingUsers.length === 0 ? (
                <p style={{ color: "#9ca3af", marginBottom: 0 }}>
                  No accounts are currently awaiting approval. 🎉
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th align="left">ID</th>
                        <th align="left">Name</th>
                        <th align="left">Email</th>
                        <th align="left">Registered</th>
                        <th align="left">Role to Assign</th>
                        <th align="left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map((entry) => {
                        const isBusy = busyId === entry.id;

                        return (
                          <tr key={entry.id}>
                            <td style={{ padding: "0.75rem 0" }}>{entry.id}</td>
                            <td>{entry.name}</td>
                            <td>{entry.email}</td>
                            <td style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                              {entry.createdAt
                                ? new Date(entry.createdAt).toLocaleDateString()
                                : "—"}
                            </td>
                            <td>
                              <select
                                className="form-input"
                                value={pendingRoleDrafts[entry.id] ?? "USER"}
                                onChange={(e) =>
                                  setPendingRoleDrafts((current) => ({
                                    ...current,
                                    [entry.id]: e.target.value as UserRole,
                                  }))
                                }
                                disabled={isBusy}
                              >
                                <option value="USER">USER</option>
                                <option value="AGENT">AGENT</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </td>
                            <td>
                              <button
                                className="button"
                                onClick={() => handleApprove(entry)}
                                disabled={isBusy}
                                style={{ background: "#10b981" }}
                              >
                                {isBusy ? "Approving..." : "Approve"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── ALL ACTIVE USERS TAB ──────────────────────────────────────── */}
          {activeTab === "all" && (
            <div className="card" style={{ borderTop: "2px solid #1d4ed8" }}>
              {allUsers.length === 0 ? (
                <p style={{ color: "#9ca3af", marginBottom: 0 }}>No active users found.</p>
              ) : (
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
                      {allUsers.map((entry) => {
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
                                onChange={(e) =>
                                  setRoleDrafts((current) => ({
                                    ...current,
                                    [entry.id]: e.target.value as UserRole,
                                  }))
                                }
                                disabled={isBusy || isSelf}
                              >
                                <option value="USER">USER</option>
                                <option value="AGENT">AGENT</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </td>
                            <td>
                              <span
                                style={{
                                  color: entry.isActive ? "#10b981" : "#ef4444",
                                  fontWeight: 600,
                                }}
                              >
                                {entry.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                <button
                                  className="button"
                                  onClick={() => handleRoleSave(entry)}
                                  disabled={
                                    isBusy ||
                                    isSelf ||
                                    roleDrafts[entry.id] === entry.role
                                  }
                                >
                                  Save Role
                                </button>
                                <button
                                  className="button"
                                  onClick={() => handleStatusToggle(entry)}
                                  disabled={isBusy || isSelf}
                                  style={{
                                    backgroundColor: entry.isActive
                                      ? "#ef4444"
                                      : "#10b981",
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
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}