"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthLinks } from "@/components/AuthLinks";

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Missing or invalid reset token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "Unable to reset password.");
        return;
      }

      setMessage("Password reset complete. You can now sign in.");
      setPassword("");
      setConfirm("");
    } catch {
      setError("Unable to reset password right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container auth-page">
      <article className="card auth-card">
        <h1>Reset password</h1>
        <p className="muted">
          Enter your new password for this account.
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            minLength={8}
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}
        <AuthLinks links={[{ href: "/login", label: "Back to sign in" }]} />
      </article>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="container auth-page">
          <article className="card auth-card">
            <h1>Reset password</h1>
            <p className="muted">Loading reset form...</p>
          </article>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
