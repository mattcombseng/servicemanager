"use client";

import { AuthLinks } from "@/components/AuthLinks";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const initialToken = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to verify email.");
      }

      setStatus("success");
      setMessage(payload?.message ?? "Email verified. You can now sign in.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to verify email.");
    }
  }

  return (
    <main className="container auth-page">
      <article className="card auth-card">
        <h1>Verify Email</h1>
        <p className="muted">
          Paste your verification token below to activate your account for credential login.
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label htmlFor="verify-token">Verification token</label>
          <input
            id="verify-token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
          <button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Verifying..." : "Verify email"}
          </button>
        </form>
        {message ? (
          <p className={status === "success" ? "success-text" : "error-text"}>{message}</p>
        ) : null}
        <AuthLinks
          links={[
            { href: "/login", label: "Back to sign in" },
            { href: "/forgot-password", label: "Need a reset token?" },
          ]}
        />
      </article>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="container auth-page">
          <article className="card auth-card">
            <h1>Verify Email</h1>
            <p className="muted">Loading verification form...</p>
          </article>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
