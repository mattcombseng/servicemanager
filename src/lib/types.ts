export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
};

export type ServiceOption = {
  id: string;
  name: string;
  description: string;
  defaultRate: number;
  durationMinutes: number;
  createdAt: string;
};

export type ScheduleItem = {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  dateTime: string;
  notes: string;
  createdAt: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid";

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  serviceId: string;
};

export type Invoice = {
  id: string;
  customerId: string;
  customerName: string;
  dateIssued: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  notes: string;
  createdAt: string;
};

export type ShopState = {
  customers: Customer[];
  services: ServiceOption[];
  scheduleEntries: ScheduleItem[];
  invoices: Invoice[];
  updatedAt: string;
};
