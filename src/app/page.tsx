import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>Shop Management Hub</h1>
      <p className="muted">
        PostgreSQL-backed shop management with role-based auth for staff and customers.
      </p>
      <section className="grid two-up">
        <article className="card">
          <h2>Staff Access</h2>
          <p className="muted">Manage customers, services, appointments, and invoices.</p>
          <div className="inline-buttons" style={{ marginTop: 12 }}>
            <Link href="/login?role=staff">
              <button type="button">Staff Login</button>
            </Link>
            <Link href="/register?role=staff">
              <button type="button">Create Staff Account</button>
            </Link>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            Staff registration now requires a valid invite token.
          </p>
        </article>
        <article className="card">
          <h2>Customer Access</h2>
          <p className="muted">
            Sign in with email/password or Google to schedule and manage your appointments.
          </p>
          <div className="inline-buttons" style={{ marginTop: 12 }}>
            <Link href="/login?role=customer">
              <button type="button">Customer Login</button>
            </Link>
            <Link href="/register?role=customer">
              <button type="button">Customer Register</button>
            </Link>
          </div>
          <div className="inline-buttons" style={{ marginTop: 10 }}>
            <Link href="/forgot-password">
              <button type="button" className="secondary">
                Forgot Password
              </button>
            </Link>
            <Link href="/verify-email">
              <button type="button" className="secondary">
                Verify Email
              </button>
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
