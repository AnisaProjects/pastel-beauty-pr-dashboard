"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!res || res.error) {
        setError("That email/password combination wasn't recognized.");
        setSubmitting(false);
        return;
      }
      window.location.href = res.url || callbackUrl;
    } catch {
      setError("Something went wrong signing you in. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field" style={{ marginBottom: 14 }}>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@pastelbeauty.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="form-field" style={{ marginBottom: 14 }}>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>
      {error && <div className="form-error show">{error}</div>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
