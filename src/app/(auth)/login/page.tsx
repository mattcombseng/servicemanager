"use client";

import { Suspense } from "react";
import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLinks } from "@/components/AuthLinks";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const roleParam = useMemo(() => params.get("role"), [params]);
  const isStaffFlow = roleParam === "staff";
  const defaultCallbackUrl = roleParam === "staff" ? "/staff" : "/customer";
  const callbackUrl = useMemo(
    () => params.get("callbackUrl") ?? defaultCallbackUrl,
    [defaultCallbackUrl, params]
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentialsLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!response || response.error) {
      setError("Invalid email or password.");
      return;
    }

    const destination = response.url ?? callbackUrl;
    if (isStaffFlow && !destination.includes("/staff")) {
      setError("Staff accounts must sign in from the staff flow.");
      return;
    }
    if (!isStaffFlow && destination.includes("/staff")) {
      setError("Customer accounts cannot access the staff dashboard.");
      return;
    }

    router.push(destination);
    router.refresh();
  }

  async function handleGoogleLogin() {
    if (isStaffFlow) {
      setError("Google sign-in is only enabled for customer accounts.");
      return;
    }
    await signIn("google", { callbackUrl });
  }

  return (
    <main className="container auth-page">
      <article className="card auth-card">
        <h1>Sign in</h1>
        <p className="muted">
          Staff and customers can sign in with email/password. Google is available for customer accounts.
        </p>
        <form className="form" onSubmit={handleCredentialsLogin}>
          <input
            type="email"
            value={email}
            placeholder="Email"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            value={password}
            placeholder="Password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <button type="button" className="secondary" onClick={handleGoogleLogin}>
          Continue with Google (customers)
        </button>
        {error ? <p className="error">{error}</p> : null}
        <AuthLinks />
      </article>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="container auth-page">
          <article className="card auth-card">
            <h1>Sign in</h1>
            <p className="muted">Loading sign-in options...</p>
          </article>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
