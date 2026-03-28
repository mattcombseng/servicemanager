"use client";

import { FormEvent, useState } from "react";
import { AuthLinks } from "@/components/AuthLinks";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResultMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        message?: string;
        resetToken?: string;
        expiresAt?: string;
      };

      if (!response.ok) {
        setResultMessage("Unable to start password reset right now.");
      } else if (payload.resetToken) {
        setResultMessage(
          `Reset token (dev/demo): ${payload.resetToken} (expires ${payload.expiresAt ?? "soon"})`
        );
      } else {
        setResultMessage(
          payload.message ??
            "If an account exists for that email, reset instructions were generated."
        );
      }
    } catch {
      setResultMessage("Unable to start password reset right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container auth-page">
      <article className="card auth-card">
        <h1>Forgot password</h1>
        <p className="muted">
          Enter your account email and we will generate a password reset token.
        </p>
        <form className="form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Generating..." : "Generate reset token"}
          </button>
        </form>
        {resultMessage ? <p className="muted">{resultMessage}</p> : null}
        <AuthLinks />
      </article>
    </main>
  );
}
