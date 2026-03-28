import { z } from "zod";

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["STAFF", "CUSTOMER"]),
  phone: z.string().trim().optional(),
  inviteToken: z.string().trim().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("A valid email is required."),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16, "Reset token is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(16, "Verification token is required."),
});

export const staffInviteCreateSchema = z.object({
  email: z.string().trim().email("A valid email is required."),
  daysValid: z.coerce
    .number()
    .int("Days valid must be a whole number.")
    .min(1, "Days valid must be at least 1.")
    .max(30, "Days valid cannot exceed 30.")
    .default(7),
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

export const paymentLinkCreateSchema = z.object({
  invoiceId: z.string().cuid("Invalid invoice identifier."),
  expiresInHours: z.coerce
    .number()
    .int("Expiration hours must be a whole number.")
    .min(1, "Expiration hours must be at least 1.")
    .max(24 * 14, "Expiration hours cannot exceed 14 days.")
    .default(24 * 7),
  amount: z.coerce.number().positive("Amount must be greater than zero.").optional(),
  externalRef: z.string().trim().optional(),
});

export const paymentWebhookSchema = z.object({
  paymentLinkId: z.string().cuid("Invalid payment link identifier."),
  status: z.enum(["SUCCEEDED", "FAILED"]),
  amount: z.coerce.number().positive("Amount must be greater than zero.").optional(),
  externalRef: z.string().trim().optional(),
});

export const notificationSendSchema = z.object({
  type: z.enum(["APPOINTMENT_REMINDER", "INVOICE_DUE", "PAYMENT_RECEIVED"]),
  customerId: z.string().cuid("Invalid customer identifier."),
  invoiceId: z.string().cuid("Invalid invoice identifier.").optional(),
  subject: z.string().trim().min(3, "Subject is required."),
  body: z.string().trim().min(3, "Body is required."),
});
