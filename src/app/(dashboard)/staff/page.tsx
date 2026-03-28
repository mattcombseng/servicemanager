"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type {
  AppointmentView,
  CustomerView,
  InvoiceView,
  ServiceView,
  StaffDashboardPayload,
} from "@/lib/dashboard-types";

type AppState = {
  customers: CustomerView[];
  services: ServiceView[];
  appointments: AppointmentView[];
  invoices: InvoiceView[];
};

function statusLabel(status: string): string {
  return status.toLowerCase();
}

export default function StaffDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState<AppState>({
    customers: [],
    services: [],
    appointments: [],
    invoices: [],
  });
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    defaultRate: "",
    durationMinutes: "",
  });
  const [appointmentForm, setAppointmentForm] = useState({
    customerId: "",
    serviceId: "",
    startsAt: "",
    notes: "",
  });
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "",
    serviceId: "",
    issuedAt: "",
    dueAt: "",
    quantity: "1",
    unitPrice: "",
    taxRatePercent: "0",
    lineDescription: "",
    notes: "",
  });

  async function fetchDashboardData() {
    setLoading(true);
    setError("");
    try {
      const [customersRes, servicesRes, appointmentsRes, invoicesRes] = await Promise.all([
        fetch("/api/staff/customers"),
        fetch("/api/staff/services"),
        fetch("/api/staff/appointments"),
        fetch("/api/staff/invoices"),
      ]);
      if (!customersRes.ok || !servicesRes.ok || !appointmentsRes.ok || !invoicesRes.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const [customersPayload, servicesPayload, appointmentsPayload, invoicesPayload] =
        await Promise.all([
          customersRes.json() as Promise<{ customers: CustomerView[] }>,
          servicesRes.json() as Promise<{ services: ServiceView[] }>,
          appointmentsRes.json() as Promise<{ appointments: AppointmentView[] }>,
          invoicesRes.json() as Promise<{ invoices: InvoiceView[] }>,
        ]);

      const payload: StaffDashboardPayload = {
        customers: customersPayload.customers,
        services: servicesPayload.services,
        appointments: appointmentsPayload.appointments,
        invoices: invoicesPayload.invoices,
      };

      setState({
        customers: payload.customers,
        services: payload.services,
        appointments: payload.appointments,
        invoices: payload.invoices,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const revenueTotal = useMemo(
    () => state.invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    [state.invoices]
  );

  const upcomingAppointments = useMemo(
    () =>
      [...state.appointments]
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, 5),
    [state.appointments]
  );

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch("/api/staff/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customerForm),
    });
    if (!res.ok) {
      setError("Unable to create customer");
      return;
    }
    setCustomerForm({ name: "", email: "", phone: "", notes: "" });
    await fetchDashboardData();
  }

  async function handleCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch("/api/staff/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serviceForm),
    });
    if (!res.ok) {
      setError("Unable to create service");
      return;
    }
    setServiceForm({
      name: "",
      description: "",
      defaultRate: "",
      durationMinutes: "",
    });
    await fetchDashboardData();
  }

  async function handleCreateAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch("/api/staff/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(appointmentForm),
    });
    if (!res.ok) {
      setError("Unable to create appointment");
      return;
    }
    setAppointmentForm({
      customerId: "",
      serviceId: "",
      startsAt: "",
      notes: "",
    });
    await fetchDashboardData();
  }

  async function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch("/api/staff/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: invoiceForm.customerId,
        serviceId: invoiceForm.serviceId,
        issuedAt: invoiceForm.issuedAt,
        dueAt: invoiceForm.dueAt,
        quantity: invoiceForm.quantity,
        unitPrice: invoiceForm.unitPrice || 0,
        taxRatePercent: invoiceForm.taxRatePercent,
        lineDescription:
          invoiceForm.lineDescription ||
          `${state.services.find((service) => service.id === invoiceForm.serviceId)?.name ?? "Service"} service`,
        notes: invoiceForm.notes,
      }),
    });
    if (!res.ok) {
      setError("Unable to create invoice");
      return;
    }
    setInvoiceForm({
      customerId: "",
      serviceId: "",
      issuedAt: "",
      dueAt: "",
      quantity: "1",
      unitPrice: "",
      taxRatePercent: "0",
      lineDescription: "",
      notes: "",
    });
    await fetchDashboardData();
  }

  async function updateInvoiceStatus(invoiceId: string, status: "SENT" | "PAID") {
    const res = await fetch("/api/staff/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, status }),
    });
    if (!res.ok) {
      setError("Unable to update invoice status");
      return;
    }
    await fetchDashboardData();
  }

  if (loading) {
    return (
      <main className="container">
        <p>Loading staff dashboard...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Staff Dashboard</h1>
      <p className="muted">
        Manage customers, services, scheduling, and invoices. Customer Google sign-in is available on the customer portal.
      </p>
      <div className="inline-buttons" style={{ marginTop: 8 }}>
        <button type="button" onClick={() => void signOut({ callbackUrl: "/" })}>
          Sign out
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="grid summary-grid">
        <article className="card">
          <h2>Customers</h2>
          <p className="value">{state.customers.length}</p>
        </article>
        <article className="card">
          <h2>Services</h2>
          <p className="value">{state.services.length}</p>
        </article>
        <article className="card">
          <h2>Invoices</h2>
          <p className="value">{state.invoices.length}</p>
        </article>
        <article className="card">
          <h2>Total Revenue</h2>
          <p className="value">{formatCurrency(revenueTotal)}</p>
        </article>
      </section>

      <section className="grid two-up">
        <article className="card">
          <h2>Add Customer</h2>
          <form className="form" onSubmit={handleCreateCustomer}>
            <input
              placeholder="Name"
              required
              value={customerForm.name}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              type="email"
              placeholder="Email"
              value={customerForm.email}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              placeholder="Phone"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <textarea
              placeholder="Notes"
              rows={3}
              value={customerForm.notes}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
            <button type="submit">Save Customer</button>
          </form>
        </article>

        <article className="card">
          <h2>Add Service Template</h2>
          <form className="form" onSubmit={handleCreateService}>
            <input
              placeholder="Service name"
              required
              value={serviceForm.name}
              onChange={(e) => setServiceForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <textarea
              placeholder="Description"
              rows={3}
              value={serviceForm.description}
              onChange={(e) =>
                setServiceForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Default rate"
              required
              value={serviceForm.defaultRate}
              onChange={(e) =>
                setServiceForm((prev) => ({ ...prev, defaultRate: e.target.value }))
              }
            />
            <input
              type="number"
              min={5}
              step={5}
              placeholder="Duration (minutes)"
              required
              value={serviceForm.durationMinutes}
              onChange={(e) =>
                setServiceForm((prev) => ({ ...prev, durationMinutes: e.target.value }))
              }
            />
            <button type="submit">Save Service</button>
          </form>
        </article>
      </section>

      <section className="grid two-up">
        <article className="card">
          <h2>Schedule Appointment</h2>
          <form className="form" onSubmit={handleCreateAppointment}>
            <select
              required
              value={appointmentForm.customerId}
              onChange={(e) =>
                setAppointmentForm((prev) => ({ ...prev, customerId: e.target.value }))
              }
            >
              <option value="">Choose customer</option>
              {state.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <select
              required
              value={appointmentForm.serviceId}
              onChange={(e) =>
                setAppointmentForm((prev) => ({ ...prev, serviceId: e.target.value }))
              }
            >
              <option value="">Choose service</option>
              {state.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              required
              value={appointmentForm.startsAt}
              onChange={(e) =>
                setAppointmentForm((prev) => ({ ...prev, startsAt: e.target.value }))
              }
            />
            <textarea
              rows={3}
              placeholder="Appointment notes"
              value={appointmentForm.notes}
              onChange={(e) => setAppointmentForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
            <button type="submit">Create Appointment</button>
          </form>
        </article>

        <article className="card">
          <h2>Create Invoice</h2>
          <form className="form" onSubmit={handleCreateInvoice}>
            <select
              required
              value={invoiceForm.customerId}
              onChange={(e) =>
                setInvoiceForm((prev) => ({ ...prev, customerId: e.target.value }))
              }
            >
              <option value="">Choose customer</option>
              {state.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <select
              required
              value={invoiceForm.serviceId}
              onChange={(e) =>
                setInvoiceForm((prev) => ({ ...prev, serviceId: e.target.value }))
              }
            >
              <option value="">Choose service</option>
              {state.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({formatCurrency(service.defaultRate)})
                </option>
              ))}
            </select>
            <input
              type="date"
              required
              value={invoiceForm.issuedAt}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, issuedAt: e.target.value }))}
            />
            <input
              type="date"
              required
              value={invoiceForm.dueAt}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, dueAt: e.target.value }))}
            />
            <input
              type="number"
              min={1}
              step={1}
              placeholder="Quantity"
              value={invoiceForm.quantity}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, quantity: e.target.value }))}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Unit price (optional)"
              value={invoiceForm.unitPrice}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
            />
            <input
              placeholder="Line description (optional)"
              value={invoiceForm.lineDescription}
              onChange={(e) =>
                setInvoiceForm((prev) => ({ ...prev, lineDescription: e.target.value }))
              }
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Tax rate %"
              value={invoiceForm.taxRatePercent}
              onChange={(e) =>
                setInvoiceForm((prev) => ({ ...prev, taxRatePercent: e.target.value }))
              }
            />
            <textarea
              rows={2}
              placeholder="Invoice notes"
              value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
            <button type="submit">Save Invoice</button>
          </form>
        </article>
      </section>

      <section className="grid two-up">
        <article className="card">
          <h2>Upcoming Appointments</h2>
          {upcomingAppointments.length === 0 ? (
            <p className="muted">No appointments yet.</p>
          ) : (
            <ul className="list">
              {upcomingAppointments.map((entry) => (
                <li key={entry.id}>
                  <strong>{formatDateTime(entry.startsAt)}</strong>
                  <div>{entry.customerName}</div>
                  <div className="muted">{entry.serviceName}</div>
                  <div className="muted">Status: {statusLabel(entry.status)}</div>
                  {entry.notes ? <div className="muted">{entry.notes}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <h2>Invoices</h2>
          {state.invoices.length === 0 ? (
            <p className="muted">No invoices yet.</p>
          ) : (
            <ul className="list">
              {state.invoices.map((invoice) => (
                <li key={invoice.id}>
                  <strong>{invoice.customerName}</strong>
                  <div>
                    {invoice.issuedAt.slice(0, 10)} - due {invoice.dueAt.slice(0, 10)}
                  </div>
                  <div>{formatCurrency(invoice.total)}</div>
                  <div className="badge-row">
                    <span className={`badge badge-${statusLabel(invoice.status)}`}>
                      {statusLabel(invoice.status)}
                    </span>
                    <div className="inline-buttons">
                      {invoice.status !== "SENT" ? (
                        <button type="button" onClick={() => updateInvoiceStatus(invoice.id, "SENT")}>
                          Mark Sent
                        </button>
                      ) : null}
                      {invoice.status !== "PAID" ? (
                        <button type="button" onClick={() => updateInvoiceStatus(invoice.id, "PAID")}>
                          Mark Paid
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {invoice.notes ? <div className="muted">{invoice.notes}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
