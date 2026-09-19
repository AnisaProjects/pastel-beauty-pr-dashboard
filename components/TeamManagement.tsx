"use client";

import { useCallback, useEffect, useState } from "react";

import { createUser, fetchUsers, resetUserPassword, setUserActive, updateUserRole } from "@/lib/api-client";
import type { UserRole, UserSummary } from "@/lib/types";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TeamManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await fetchUsers();
      setUsers(list);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load users");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleAddUser() {
    setAddError(null);
    setAdding(true);
    try {
      await createUser({ name: name.trim(), email: email.trim(), password, role });
      setName("");
      setEmail("");
      setPassword("");
      setRole("member");
      await load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(id: string, newRole: UserRole) {
    setRowError(null);
    setBusyId(id);
    try {
      await updateUserRole(id, newRole);
      await load();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setRowError(null);
    setBusyId(id);
    try {
      await setUserActive(id, isActive);
      await load();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(id: string) {
    if (resetPassword.length < 8) {
      setRowError("New password must be at least 8 characters.");
      return;
    }
    setRowError(null);
    setBusyId(id);
    try {
      await resetUserPassword(id, resetPassword);
      setResettingId(null);
      setResetPassword("");
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="wrap">
      <div className="panel reports-toolbar">
        <div>
          <h2>Team</h2>
          <p>
            Add teammates, control who can manage users (admin), and reset passwords. Deactivating an account blocks
            login but keeps their history intact.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Add a user</h3>
        <div className="form-row">
          <div className="form-field">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Temporary password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="form-field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value === "admin" ? "admin" : "member")}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        {addError && <div className="form-error show">{addError}</div>}
        <button type="button" className="btn" onClick={handleAddUser} disabled={adding || !name || !email || !password}>
          {adding ? "Adding…" : "Add user"}
        </button>
      </div>

      {loadError && (
        <div className="panel report-error">
          <strong>Couldn&apos;t load users:</strong> {loadError}
        </div>
      )}
      {rowError && (
        <div className="panel report-error">
          <strong>Error:</strong> {rowError}
        </div>
      )}

      {users === null && !loadError && (
        <div className="panel placeholder-panel">
          <h2>Loading…</h2>
        </div>
      )}

      {users !== null && (
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.name} {isSelf && <span className="badge standard">You</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={isSelf || busy}
                        onChange={(e) => handleRoleChange(u.id, e.target.value === "admin" ? "admin" : "member")}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? "new" : "test"}`}>{u.isActive ? "Active" : "Deactivated"}</span>
                    </td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn subtle small"
                          disabled={isSelf || busy}
                          onClick={() => handleToggleActive(u.id, !u.isActive)}
                        >
                          {u.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                        {resettingId === u.id ? (
                          <>
                            <input
                              type="password"
                              placeholder="New password"
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              style={{ width: 140 }}
                            />
                            <button type="button" className="btn small" disabled={busy} onClick={() => handleResetPassword(u.id)}>
                              Set
                            </button>
                            <button
                              type="button"
                              className="btn ghost small"
                              onClick={() => {
                                setResettingId(null);
                                setResetPassword("");
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn subtle small"
                            disabled={busy}
                            onClick={() => {
                              setResettingId(u.id);
                              setResetPassword("");
                              setRowError(null);
                            }}
                          >
                            Reset password
                          </button>
                        )}
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
  );
}
