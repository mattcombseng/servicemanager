import { z } from "zod";

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["STAFF", "CUSTOMER"]),
  phone: z.string().trim().optional(),
});

export const customerCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z
    .string()
    .trim()
    .email("A valid email is required.")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(2, "Service name is required."),
  description: z.string().trim().optional(),
  defaultRate: z.coerce.number().min(0, "Default rate cannot be negative."),
  durationMinutes: z.coerce
    .number()
    .int("Duration must be a whole number.")
    .min(1, "Duration must be at least 1 minute."),
});

export const staffAppointmentCreateSchema = z.object({
  customerId: z.string().cuid("Invalid customer identifier."),
  serviceId: z.string().cuid("Invalid service identifier."),
  startsAt: z.string().min(1, "Appointment date/time is required."),
  notes: z.string().trim().optional(),
});

export const customerAppointmentCreateSchema = z.object({
  serviceId: z.string().cuid("Invalid service identifier."),
  startsAt: z.string().min(1, "Appointment date/time is required."),
  notes: z.string().trim().optional(),
});

export const invoiceCreateSchema = z.object({
  customerId: z.string().cuid("Invalid customer identifier."),
  serviceId: z.string().cuid("Invalid service identifier."),
  issuedAt: z.string().min(1, "Issued date is required."),
  dueAt: z.string().min(1, "Due date is required."),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  taxRatePercent: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative.")
    .max(100, "Tax rate cannot exceed 100."),
  lineDescription: z.string().trim().min(1, "Line description is required."),
  notes: z.string().trim().optional(),
});

export const invoiceStatusUpdateSchema = z.object({
  invoiceId: z.string().cuid("Invalid invoice identifier."),
  status: z.enum(["SENT", "PAID"]),
});
