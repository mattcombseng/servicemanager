"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Props = {
  role: "CUSTOMER" | "STAFF";
  inviteToken?: string;
};

export default function RegisterForm({ role, inviteToken }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone: role === "CUSTOMER" ? phone : undefined,
          inviteToken: role === "STAFF" ? inviteToken : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Registration failed.");
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as {
        verificationToken?: string;
        email?: string;
      };

      if (payload.verificationToken) {
        const emailParam = encodeURIComponent(payload.email ?? email);
        router.push(
          `/verify-email?token=${encodeURIComponent(payload.verificationToken)}&email=${emailParam}`
        );
        router.refresh();
        return;
      }

      const callbackUrl = role === "STAFF" ? "/staff" : "/customer";

      const signInResult = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created, but automatic sign-in failed. Please sign in manually.");
        setLoading(false);
        return;
      }

      router.push(signInResult?.url ?? callbackUrl);
      router.refresh();
    } catch {
      setError("Unable to register right now.");
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label htmlFor={`name-${role}`}>Name</label>
      <input
        id={`name-${role}`}
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <label htmlFor={`email-${role}`}>Email</label>
      <input
        id={`email-${role}`}
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      {role === "CUSTOMER" ? (
        <>
          <label htmlFor="phone-customer">Phone (optional)</label>
          <input
            id="phone-customer"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </>
      ) : null}

      <label htmlFor={`password-${role}`}>Password</label>
      <input
        id={`password-${role}`}
        type="password"
        minLength={8}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={loading} type="submit">
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
