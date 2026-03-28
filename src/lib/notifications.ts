import type { NotificationType, PrismaClient, Prisma } from "@prisma/client";
import { formatCurrency, toMoneyNumber } from "@/lib/format";

type QueueNotificationInput = {
  type: NotificationType;
  customerId: string;
  invoiceId?: string;
  subject: string;
  body: string;
  metadata?: Prisma.InputJsonValue;
};

export async function queueNotification(
  prisma: PrismaClient,
  input: QueueNotificationInput
) {
  return prisma.notificationEvent.create({
    data: {
      type: input.type,
      customerId: input.customerId,
      invoiceId: input.invoiceId,
      subject: input.subject,
      body: input.body,
      metadata: input.metadata,
    },
  });
}

export async function queuePaymentReceivedNotification(
  prisma: PrismaClient,
  input: {
    customerId: string;
    invoiceId: string;
    customerName: string;
    amount: number;
  }
) {
  return queueNotification(prisma, {
    type: "PAYMENT_RECEIVED",
    customerId: input.customerId,
    invoiceId: input.invoiceId,
    subject: `Payment received for invoice ${input.invoiceId.slice(0, 8)}`,
    body: `Hi ${input.customerName}, we received your payment of ${formatCurrency(
      input.amount
    )}. Thank you.`,
    metadata: {
      amount: input.amount,
      source: "payment_webhook",
    },
  });
}

export async function queueInvoiceDueNotifications(prisma: PrismaClient) {
  const today = new Date();
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["DRAFT", "SENT"] },
      dueAt: { gte: today, lte: inThreeDays },
      customer: {
        email: { not: null },
      },
    },
    include: {
      customer: true,
    },
    take: 200,
  });

  if (invoices.length === 0) return 0;

  const results = await Promise.all(
    invoices.map((invoice) =>
      queueNotification(prisma, {
        type: "INVOICE_DUE",
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        subject: `Invoice due soon (${invoice.id.slice(0, 8)})`,
        body: `Your invoice for ${formatCurrency(
          toMoneyNumber(invoice.total)
        )} is due on ${invoice.dueAt.toLocaleDateString()}.`,
        metadata: {
          dueAt: invoice.dueAt.toISOString(),
          source: "automated_invoice_due",
        },
      })
    )
  );

  return results.length;
}

export async function queueUpcomingAppointmentReminders(prisma: PrismaClient) {
  const now = new Date();
  const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gte: now, lte: in24Hours },
      customer: {
        email: { not: null },
      },
    },
    include: {
      customer: true,
      service: true,
    },
    take: 200,
  });

  if (appointments.length === 0) return 0;

  const results = await Promise.all(
    appointments.map((appointment) =>
      queueNotification(prisma, {
        type: "APPOINTMENT_REMINDER",
        customerId: appointment.customerId,
        subject: `Reminder: ${appointment.service.name} appointment`,
        body: `Hi ${appointment.customer.name}, reminder for your appointment on ${appointment.startsAt.toLocaleString()}.`,
        metadata: {
          appointmentId: appointment.id,
          startsAt: appointment.startsAt.toISOString(),
          serviceName: appointment.service.name,
          source: "automated_appointment_reminder",
        },
      })
    )
  );

  return results.length;
}

