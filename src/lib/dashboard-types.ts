export type CustomerView = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type ServiceView = {
  id: string;
  name: string;
  description: string | null;
  defaultRate: number;
  durationMinutes: number;
};

export type AppointmentView = {
  id: string;
  startsAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  customerName: string;
  serviceName: string;
};

export type AppointmentStatusValue = AppointmentView["status"];

export type InvoiceView = {
  id: string;
  issuedAt: string;
  dueAt: string;
  status: "DRAFT" | "SENT" | "PAID";
  total: number;
  notes: string | null;
  customerName: string;
};

export type StaffDashboardPayload = {
  customers: CustomerView[];
  services: ServiceView[];
  appointments: AppointmentView[];
  invoices: InvoiceView[];
};

export type CustomerDashboardData = {
  services: ServiceView[];
  appointments: Array<{
    id: string;
    startsAt: string;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
    notes: string | null;
    serviceName: string;
  }>;
};
