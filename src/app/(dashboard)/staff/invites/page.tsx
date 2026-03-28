"use client";

import { FormEvent, useEffect, useState } from "react";

type InviteView = {
  id: string;
  email: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export default function StaffInvitesPage() {
  const [email, setEmail] = useState("");
  const [daysValid, setDaysValid] = useState("7");
  const [inviteLink, setInviteLink] = useState("");
  const [invites, setInvites] = useState<InviteView[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadInvites() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/staff/invites", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to load invites");
      }

      const payload = (await response.json()) as { invites: InviteView[] };
      setInvites(payload.invites);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load invites.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvites();
  }, []);

  async function handleCreateInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/staff/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          daysValid,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; inviteLink?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to create invite");
      }

      setInviteLink(payload?.inviteLink ?? "");
      setEmail("");
      setDaysValid("7");
      await loadInvites();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create invite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>Staff Invites</h1>
      <p className="muted">Create one-time invite links for new staff account registration.</p>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="grid two-up">
        <article className="card">
          <h2>Create Invite</h2>
          <form className="form" onSubmit={handleCreateInvite}>
            <input
              type="email"
              placeholder="Staff email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              placeholder="Days valid"
              value={daysValid}
              onChange={(event) => setDaysValid(event.target.value)}
              required
            />
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Invite"}
            </button>
          </form>
          {inviteLink ? (
            <div style={{ marginTop: 12 }}>
              <p className="muted">Invite link (copy and send securely):</p>
              <code style={{ wordBreak: "break-all" }}>{inviteLink}</code>
            </div>
          ) : null}
        </article>

        <article className="card">
          <h2>Recent Invites</h2>
          {loading ? (
            <p className="muted">Loading invites...</p>
          ) : invites.length === 0 ? (
            <p className="muted">No invites created yet.</p>
          ) : (
            <ul className="list">
              {invites.map((invite) => (
                <li key={invite.id}>
                  <strong>{invite.email}</strong>
                  <div className="muted">
                    Expires: {new Date(invite.expiresAt).toLocaleString()}
                  </div>
                  <div className="muted">
                    Status: {invite.usedAt ? "Used" : "Pending"}
                  </div>
                  <div className="muted">
                    Invited by: {invite.invitedBy.name ?? invite.invitedBy.email ?? "Staff"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
