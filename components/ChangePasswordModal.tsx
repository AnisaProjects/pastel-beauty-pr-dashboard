"use client";

import { useState } from "react";

import { changeOwnPassword } from "@/lib/api-client";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    setSaving(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h2>Change your password</h2>

        {done ? (
          <>
            <p className="sub">Your password has been updated.</p>
            <div className="modal-footer">
              <div className="left">
                <button className="btn" onClick={onClose} type="button">
                  Done
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="form-row">
              <div className="form-field">
                <label>Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-field">
                <label>Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && <div className="form-error show">{error}</div>}

            <div className="modal-footer">
              <div className="left">
                <button className="btn" onClick={handleSubmit} disabled={saving}>
                  {saving ? "Saving…" : "Change password"}
                </button>
                <button className="btn ghost" onClick={onClose} type="button">
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
