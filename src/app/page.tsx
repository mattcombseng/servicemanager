"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  addCustomer,
  addInvoice,
  addScheduleEntry,
  addService,
  ShopState,
  useShopData,
} from "@/lib/storage";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function HomePage() {
  const [shopState, setShopState] = useShopData();
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
  const [scheduleForm, setScheduleForm] = useState({
    customerId: "",
    serviceId: "",
    dateTime: "",
    notes: "",
  });
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "",
    serviceId: "",
    dateIssued: "",
    dueDate: "",
    taxRatePercent: "0",
    notes: "",
    lineQuantity: "1",
    lineUnitPrice: "",
    lineDescription: "",
  });

  const revenueTotal = useMemo(
    () => shopState.invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    [shopState.invoices]
  );
  const upcomingAppointments = useMemo(
    () =>
      [...shopState.scheduleEntries]
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
        .slice(0, 5),
    [shopState.scheduleEntries]
  );

  function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerForm.name.trim()) return;

    setShopState((current) =>
      addCustomer(current, {
        ...customerForm,
        name: customerForm.name.trim(),
        email: customerForm.email.trim(),
        phone: customerForm.phone.trim(),
        notes: customerForm.notes.trim(),
      })
    );
    setCustomerForm({ name: "", email: "", phone: "", notes: "" });
  }

  function handleCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceForm.name.trim()) return;

    const defaultRate = Number.parseFloat(serviceForm.defaultRate);
    const durationMinutes = Number.parseInt(serviceForm.durationMinutes, 10);

    setShopState((current) =>
      addService(current, {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim(),
        defaultRate: Number.isFinite(defaultRate) ? defaultRate : 0,
        durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 0,
      })
    );
    setServiceForm({
      name: "",
      description: "",
      defaultRate: "",
      durationMinutes: "",
    });
  }

  function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scheduleForm.customerId || !scheduleForm.serviceId || !scheduleForm.dateTime) return;

    const customer = shopState.customers.find((item) => item.id === scheduleForm.customerId);
    const service = shopState.services.find((item) => item.id === scheduleForm.serviceId);
    if (!customer || !service) return;

    setShopState((current) =>
      addScheduleEntry(current, {
        customerId: customer.id,
        customerName: customer.name,
        serviceId: service.id,
        serviceName: service.name,
        dateTime: scheduleForm.dateTime,
        notes: scheduleForm.notes.trim(),
      })
    );
    setScheduleForm({
      customerId: "",
      serviceId: "",
      dateTime: "",
      notes: "",
    });
  }

  function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoiceForm.customerId || !invoiceForm.serviceId || !invoiceForm.dateIssued || !invoiceForm.dueDate) {
      return;
    }

    const customer = shopState.customers.find((item) => item.id === invoiceForm.customerId);
    const service = shopState.services.find((item) => item.id === invoiceForm.serviceId);
    if (!customer || !service) return;

    const quantity = Number.parseFloat(invoiceForm.lineQuantity);
    const parsedUnitPrice = Number.parseFloat(invoiceForm.lineUnitPrice);
    const unitPrice =
      Number.isFinite(parsedUnitPrice) && parsedUnitPrice > 0
        ? parsedUnitPrice
        : service.defaultRate;
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const subtotal = unitPrice * safeQuantity;
    const taxRatePercent = Number.parseFloat(invoiceForm.taxRatePercent);
    const safeTaxRate = Number.isFinite(taxRatePercent) ? taxRatePercent : 0;
    const taxAmount = subtotal * (safeTaxRate / 100);
    const total = subtotal + taxAmount;

    setShopState((current) =>
      addInvoice(current, {
        customerId: customer.id,
        customerName: customer.name,
        dateIssued: invoiceForm.dateIssued,
        dueDate: invoiceForm.dueDate,
        status: "draft",
        notes: invoiceForm.notes.trim(),
        subtotal,
        taxAmount,
        total,
        lineItems: [
          {
            id: crypto.randomUUID(),
            description:
              invoiceForm.lineDescription.trim() ||
              `${service.name} service`,
            quantity: safeQuantity,
            unitPrice,
            serviceId: service.id,
          },
        ],
      })
    );

    setInvoiceForm({
      customerId: "",
      serviceId: "",
      dateIssued: "",
      dueDate: "",
      taxRatePercent: "0",
      notes: "",
      lineQuantity: "1",
      lineUnitPrice: "",
      lineDescription: "",
    });
  }

  function setInvoiceStatus(
    invoiceId: string,
    status: ShopState["invoices"][number]["status"]
  ) {
    setShopState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) =>
        invoice.id === invoiceId ? { ...invoice, status } : invoice
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  return (
    <main className="container">
      <h1>Shop Management Hub</h1>
      <p className="muted">
        Manage customers, reusable services, schedule appointments, and draft invoices in one place.
      </p>

      <section className="grid summary-grid">
        <article className="card">
          <h2>Customers</h2>
          <p className="value">{shopState.customers.length}</p>
        </article>
        <article className="card">
          <h2>Services</h2>
          <p className="value">{shopState.services.length}</p>
        </article>
        <article className="card">
          <h2>Invoices</h2>
          <p className="value">{shopState.invoices.length}</p>
        </article>
        <article className="card">
          <h2>Total Revenue (all invoices)</h2>
          <p className="value">{formatCurrency(revenueTotal)}</p>
        </article>
      </section>

      <section className="grid two-up">
        <article className="card">
          <h2>Add Customer</h2>
          <form className="form" onSubmit={handleCreateCustomer}>
            <input
              placeholder="Name"
              value={customerForm.name}
              onChange={(event) =>
                setCustomerForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={customerForm.email}
              onChange={(event) =>
                setCustomerForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <input
              placeholder="Phone"
              value={customerForm.phone}
              onChange={(event) =>
                setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
            <textarea
              placeholder="Notes"
              value={customerForm.notes}
              onChange={(event) =>
                setCustomerForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={3}
            />
            <button type="submit">Save Customer</button>
          </form>
        </article>

        <article className="card">
          <h2>Add Service Template</h2>
          <form className="form" onSubmit={handleCreateService}>
            <input
              placeholder="Service name"
              value={serviceForm.name}
              onChange={(event) =>
                setServiceForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
            <textarea
              placeholder="Description"
              value={serviceForm.description}
              onChange={(event) =>
                setServiceForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Default rate"
              value={serviceForm.defaultRate}
              onChange={(event) =>
                setServiceForm((prev) => ({ ...prev, defaultRate: event.target.value }))
              }
            />
            <input
              type="number"
              min={0}
              step={5}
              placeholder="Duration (minutes)"
              value={serviceForm.durationMinutes}
              onChange={(event) =>
                setServiceForm((prev) => ({
                  ...prev,
                  durationMinutes: event.target.value,
                }))
              }
            />
            <button type="submit">Save Service</button>
          </form>
        </article>
      </section>

      <section className="grid two-up">
        <article className="card">
          <h2>Schedule Appointment</h2>
          <form className="form" onSubmit={handleCreateSchedule}>
            <select
              value={scheduleForm.customerId}
              onChange={(event) =>
                setScheduleForm((prev) => ({ ...prev, customerId: event.target.value }))
              }
              required
            >
              <option value="">Choose customer</option>
              {shopState.customers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <select
              value={scheduleForm.serviceId}
              onChange={(event) =>
                setScheduleForm((prev) => ({ ...prev, serviceId: event.target.value }))
              }
              required
            >
              <option value="">Choose service</option>
              {shopState.services.map((service) => (
                <option value={service.id} key={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={scheduleForm.dateTime}
              onChange={(event) =>
                setScheduleForm((prev) => ({ ...prev, dateTime: event.target.value }))
              }
              required
            />
            <textarea
              rows={3}
              placeholder="Appointment notes"
              value={scheduleForm.notes}
              onChange={(event) =>
                setScheduleForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
            <button type="submit">Create Appointment</button>
          </form>
        </article>

        <article className="card">
          <h2>Create Invoice</h2>
          <form className="form" onSubmit={handleCreateInvoice}>
            <select
              value={invoiceForm.customerId}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, customerId: event.target.value }))
              }
              required
            >
              <option value="">Choose customer</option>
              {shopState.customers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <select
              value={invoiceForm.serviceId}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, serviceId: event.target.value }))
              }
              required
            >
              <option value="">Choose service</option>
              {shopState.services.map((service) => (
                <option value={service.id} key={service.id}>
                  {service.name} ({formatCurrency(service.defaultRate)})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={invoiceForm.dateIssued}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, dateIssued: event.target.value }))
              }
              required
            />
            <input
              type="date"
              value={invoiceForm.dueDate}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, dueDate: event.target.value }))
              }
              required
            />
            <input
              type="number"
              min={0}
              step="1"
              placeholder="Quantity"
              value={invoiceForm.lineQuantity}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, lineQuantity: event.target.value }))
              }
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Unit price (optional)"
              value={invoiceForm.lineUnitPrice}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, lineUnitPrice: event.target.value }))
              }
            />
            <input
              placeholder="Line description (optional)"
              value={invoiceForm.lineDescription}
              onChange={(event) =>
                setInvoiceForm((prev) => ({
                  ...prev,
                  lineDescription: event.target.value,
                }))
              }
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Tax rate %"
              value={invoiceForm.taxRatePercent}
              onChange={(event) =>
                setInvoiceForm((prev) => ({
                  ...prev,
                  taxRatePercent: event.target.value,
                }))
              }
            />
            <textarea
              rows={2}
              placeholder="Invoice notes"
              value={invoiceForm.notes}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, notes: event.target.value }))
              }
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
                  <strong>{formatDateTime(entry.dateTime)}</strong>
                  <div>{entry.customerName}</div>
                  <div className="muted">{entry.serviceName}</div>
                  {entry.notes ? <div className="muted">{entry.notes}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <h2>Invoices</h2>
          {shopState.invoices.length === 0 ? (
            <p className="muted">No invoices yet.</p>
          ) : (
            <ul className="list">
              {shopState.invoices.map((invoice) => (
                <li key={invoice.id}>
                  <strong>{invoice.customerName}</strong>
                  <div>
                    {invoice.dateIssued} - due {invoice.dueDate}
                  </div>
                  <div>{formatCurrency(invoice.total)}</div>
                  <div className="badge-row">
                    <span className={`badge badge-${invoice.status}`}>
                      {invoice.status}
                    </span>
                    <div className="inline-buttons">
                      {invoice.status !== "sent" ? (
                        <button
                          type="button"
                          onClick={() => setInvoiceStatus(invoice.id, "sent")}
                        >
                          Mark Sent
                        </button>
                      ) : null}
                      {invoice.status !== "paid" ? (
                        <button
                          type="button"
                          onClick={() => setInvoiceStatus(invoice.id, "paid")}
                        >
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
