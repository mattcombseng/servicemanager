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
  paymentStatus: "PENDING" | "SUCCEEDED" | "FAILED" | null;
  paymentLinkUrl: string | null;
};

export type PaymentSummaryView = {
  id: string;
  invoiceId: string;
  invoiceCustomerName: string;
  amount: number;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  createdAt: string;
};

export type StaffDashboardPayload = {
  customers: CustomerView[];
  services: ServiceView[];
  appointments: AppointmentView[];
  invoices: InvoiceView[];
};

export type AnalyticsPayload = {
  totals: {
    invoicesCount: number;
    customersCount: number;
    paymentsReceived: number;
    outstandingAmount: number;
  };
  revenueByDay: Array<{
    day: string;
    amount: number;
  }>;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
    revenue: number;
  }>;
  appointmentUtilizationByDay: Array<{
    day: string;
    count: number;
  }>;
  outstandingInvoiceTotal: number;
  upcomingSevenDaysAppointments: number;
  noShowRiskCount: number;
  queuedNotifications: number;
  topServiceName: string | null;
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
