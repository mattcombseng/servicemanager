"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { formatCurrency } from "@/lib/format";
import type {
  AppointmentStatusValue,
  CustomerDashboardData,
  ServiceView,
} from "@/lib/dashboard-types";

type AppointmentForm = {
  serviceId: string;
  startsAt: string;
  notes: string;
};

const EMPTY_APPOINTMENT_FORM: AppointmentForm = {
  serviceId: "",
  startsAt: "",
  notes: "",
};

function appointmentStatusClass(status: AppointmentStatusValue): string {
  switch (status) {
    case "SCHEDULED":
      return "badge-sent";
    case "COMPLETED":
      return "badge-paid";
    case "CANCELLED":
      return "badge-cancelled";
    default:
      return "badge-draft";
  }
}

export default function CustomerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<CustomerDashboardData | null>(null);
  const [form, setForm] = useState<AppointmentForm>(EMPTY_APPOINTMENT_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/customer/appointments", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Unable to load dashboard.");
      }

      const payload = (await response.json()) as CustomerDashboardData;
      setDashboard(payload);
      if (!form.serviceId && payload.services[0]) {
        setForm((current) => ({ ...current, serviceId: payload.services[0].id }));
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load customer dashboard.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedService = useMemo<ServiceView | undefined>(
    () => dashboard?.services.find((service) => service.id === form.serviceId),
    [dashboard?.services, form.serviceId]
  );

  async function handleCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/customer/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Unable to schedule appointment.");
      }

      setForm((current) => ({
        ...current,
        startsAt: "",
        notes: "",
      }));
      await loadDashboard();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to create appointment.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <h1>Customer Portal</h1>
        <p className="muted">Loading your account...</p>
      </main>
    );
  }

  if (error && !dashboard) {
    return (
      <main className="container">
        <h1>Customer Portal</h1>
        <p className="error">{error}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Customer Portal</h1>
      <p className="muted">
        Book services and review upcoming appointments.
      </p>
      <div className="inline-buttons" style={{ marginTop: 8 }}>
        <button type="button" onClick={() => void signOut({ callbackUrl: "/" })}>
          Sign out
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section className="grid two-up">
        <article className="card">
          <h2>Schedule an appointment</h2>
          <form className="form" onSubmit={handleCreateAppointment}>
            <select
              value={form.serviceId}
              onChange={(event) =>
                setForm((current) => ({ ...current, serviceId: event.target.value }))
              }
              required
            >
              <option value="">Choose service</option>
              {dashboard?.services.map((service) => (
                <option value={service.id} key={service.id}>
                  {service.name} ({formatCurrency(service.defaultRate)})
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, startsAt: event.target.value }))
              }
              required
            />
            <textarea
              placeholder="Notes (optional)"
              rows={3}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
            {selectedService ? (
              <p className="muted">
                {selectedService.durationMinutes} minutes · {formatCurrency(selectedService.defaultRate)}
              </p>
            ) : null}
            <button type="submit" disabled={submitting}>
              {submitting ? "Scheduling..." : "Schedule appointment"}
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Upcoming appointments</h2>
          {!dashboard?.appointments.length ? (
            <p className="muted">No upcoming appointments.</p>
          ) : (
            <ul className="list">
              {dashboard.appointments.map((appointment) => (
                <li key={appointment.id}>
                  <strong>
                    {new Date(appointment.startsAt).toLocaleString()}
                  </strong>
                  <div>{appointment.serviceName}</div>
                  <div className="badge-row">
                    <span className={`badge ${appointmentStatusClass(appointment.status)}`}>
                      {appointment.status.toLowerCase()}
                    </span>
                  </div>
                  {appointment.notes ? (
                    <div className="muted">{appointment.notes}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
