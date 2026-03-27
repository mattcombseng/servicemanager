"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type {
  Customer,
  Invoice,
  ScheduleItem,
  ServiceOption,
  ShopState,
} from "@/lib/types";

const STORAGE_KEY = "shop-manager-data-v1";

function uid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

const demoServices: ServiceOption[] = [
  {
    id: uid(),
    name: "Standard Service",
    description: "Inspection and routine maintenance",
    durationMinutes: 60,
    defaultRate: 120,
    createdAt: nowIso(),
  },
  {
    id: uid(),
    name: "Deep Clean Package",
    description: "Premium detailing and polish",
    durationMinutes: 90,
    defaultRate: 180,
    createdAt: nowIso(),
  },
];

const demoCustomers: Customer[] = [
  {
    id: uid(),
    name: "Ava Thompson",
    email: "ava@example.com",
    phone: "(555) 010-2211",
    notes: "Prefers text reminders.",
    createdAt: nowIso(),
  },
  {
    id: uid(),
    name: "Marcus Lee",
    email: "marcus@example.com",
    phone: "(555) 010-3322",
    notes: "Fleet account.",
    createdAt: nowIso(),
  },
];

const demoScheduleEntries: ScheduleItem[] = [
  {
    id: uid(),
    customerId: demoCustomers[0]?.id ?? "",
    customerName: demoCustomers[0]?.name ?? "",
    serviceId: demoServices[0]?.id ?? "",
    serviceName: demoServices[0]?.name ?? "",
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    notes: "First-time appointment",
    createdAt: nowIso(),
  },
];

const demoInvoices: Invoice[] = [
  {
    id: uid(),
    customerId: demoCustomers[1]?.id ?? "",
    customerName: demoCustomers[1]?.name ?? "",
    dateIssued: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    lineItems: [
      {
        id: uid(),
        description: "Deep Clean Package service",
        quantity: 1,
        unitPrice: demoServices[1]?.defaultRate ?? 180,
        serviceId: demoServices[1]?.id ?? "",
      },
    ],
    subtotal: demoServices[1]?.defaultRate ?? 180,
    taxAmount: 0,
    total: demoServices[1]?.defaultRate ?? 180,
    status: "sent",
    notes: "Net 7 terms.",
    createdAt: nowIso(),
  },
];

const defaultData: ShopState = {
  services: demoServices,
  customers: demoCustomers,
  scheduleEntries: demoScheduleEntries,
  invoices: demoInvoices,
  updatedAt: nowIso(),
};

function normalizeState(state: Partial<ShopState> | null | undefined): ShopState {
  return {
    services: state?.services ?? [],
    customers: state?.customers ?? [],
    scheduleEntries: state?.scheduleEntries ?? [],
    invoices: state?.invoices ?? [],
    updatedAt: state?.updatedAt ?? nowIso(),
  };
}

export function loadShopData(): ShopState {
  if (typeof window === "undefined") return defaultData;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData;

  try {
    const parsed = JSON.parse(raw) as Partial<ShopState>;
    const normalized = normalizeState(parsed);
    return normalized.services.length || normalized.customers.length
      ? normalized
      : defaultData;
  } catch {
    return defaultData;
  }
}

export function saveShopData(data: ShopState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useShopData(): [
  ShopState,
  Dispatch<SetStateAction<ShopState>>,
] {
  const [shopState, setShopState] = useState<ShopState>(defaultData);

  useEffect(() => {
    setShopState(loadShopData());
  }, []);

  useEffect(() => {
    saveShopData(shopState);
  }, [shopState]);

  return [shopState, setShopState];
}

export function addCustomer(
  current: ShopState,
  customer: Omit<Customer, "id" | "createdAt">
): ShopState {
  return {
    ...current,
    customers: [{ ...customer, id: uid(), createdAt: nowIso() }, ...current.customers],
    updatedAt: nowIso(),
  };
}

export function addService(
  current: ShopState,
  service: Omit<ServiceOption, "id" | "createdAt">
): ShopState {
  return {
    ...current,
    services: [{ ...service, id: uid(), createdAt: nowIso() }, ...current.services],
    updatedAt: nowIso(),
  };
}

export function addScheduleEntry(
  current: ShopState,
  entry: Omit<ScheduleItem, "id" | "createdAt">
): ShopState {
  return {
    ...current,
    scheduleEntries: [{ ...entry, id: uid(), createdAt: nowIso() }, ...current.scheduleEntries],
    updatedAt: nowIso(),
  };
}

export function addInvoice(
  current: ShopState,
  invoice: Omit<Invoice, "id" | "createdAt">
): ShopState {
  return {
    ...current,
    invoices: [{ ...invoice, id: uid(), createdAt: nowIso() }, ...current.invoices],
    updatedAt: nowIso(),
  };
}

export type { ShopState } from "@/lib/types";
