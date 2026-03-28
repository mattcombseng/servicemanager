import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queueInvoiceDueNotifications, queueUpcomingAppointmentReminders } from "@/lib/notifications";
import { requireStaff } from "@/lib/session";

export async function POST() {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const [invoiceDueQueued, appointmentReminderQueued] = await Promise.all([
    queueInvoiceDueNotifications(prisma),
    queueUpcomingAppointmentReminders(prisma),
  ]);

  const processed = await prisma.notificationEvent.updateMany({
    where: { status: "QUEUED" },
    data: { status: "SENT", sentAt: new Date() },
  });

  return NextResponse.json({
    queued: {
      invoiceDue: invoiceDueQueued,
      appointmentReminder: appointmentReminderQueued,
      total: invoiceDueQueued + appointmentReminderQueued,
    },
    processed: {
      total: processed.count,
    },
  });
}

