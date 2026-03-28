import { NextResponse } from "next/server";
import { endOfDay, startOfDay, subDays, toMoneyNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export async function GET() {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const todayStart = startOfDay(now);
  const sevenDaysOutEnd = endOfDay(subDays(now, -7));
  const thirtyDaysBackStart = startOfDay(subDays(now, 29));

  const [
    totalCustomers,
    invoices,
    pendingInvoices,
    recentAppointments,
    services,
    successfulPayments,
    queuedNotificationsCount,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.invoice.findMany({
      include: {
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["DRAFT", "SENT"] } },
      select: {
        id: true,
        dueAt: true,
        total: true,
        status: true,
      },
      orderBy: { dueAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: thirtyDaysAgo },
      },
      include: {
        service: { select: { id: true, name: true } },
      },
    }),
    prisma.service.findMany({
      select: { id: true, name: true },
    }),
    prisma.payment.findMany({
      where: { status: "SUCCEEDED" },
      select: {
        amount: true,
      },
    }),
    prisma.notificationEvent.count({
      where: { status: "QUEUED" },
    }),
  ]);

  const totalRevenue = successfulPayments.reduce(
    (sum, payment) => sum + toMoneyNumber(payment.amount),
    0
  );

  const revenueByDayMap = new Map<string, number>();
  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    const day = subDays(now, 29 - dayOffset);
    const key = day.toISOString().slice(0, 10);
    revenueByDayMap.set(key, 0);
  }
  for (const invoice of invoices) {
    if (invoice.status !== "PAID") continue;
    const issuedKey = invoice.issuedAt.toISOString().slice(0, 10);
    if (!revenueByDayMap.has(issuedKey)) continue;
    revenueByDayMap.set(
      issuedKey,
      (revenueByDayMap.get(issuedKey) ?? 0) + toMoneyNumber(invoice.total)
    );
  }
  const revenueByDay = [...revenueByDayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, amount]) => ({ day, amount }));

  const serviceMap = new Map<
    string,
    { serviceId: string; serviceName: string; count: number; revenue: number }
  >();
  for (const appointment of recentAppointments) {
    const id = appointment.service.id;
    const current = serviceMap.get(id);
    const invoiceForAppointment = invoices.find(
      (invoice) => invoice.serviceId === appointment.serviceId && invoice.status === "PAID"
    );
    const revenue = invoiceForAppointment ? toMoneyNumber(invoiceForAppointment.total) : 0;
    if (current) {
      current.count += 1;
      current.revenue += revenue;
    } else {
      serviceMap.set(id, {
        serviceId: id,
        serviceName: appointment.service.name,
        count: 1,
        revenue,
      });
    }
  }

  const topServices = [...serviceMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Ensure services with zero usage can still be represented if needed.
  const knownServiceIds = new Set(topServices.map((item) => item.serviceId));
  if (topServices.length < 5) {
    for (const service of services) {
      if (knownServiceIds.has(service.id)) continue;
      topServices.push({
        serviceId: service.id,
        serviceName: service.name,
        count: 0,
        revenue: 0,
      });
      if (topServices.length >= 5) break;
    }
  }

  const outstandingInvoiceTotal = pendingInvoices.reduce(
    (sum, invoice) => sum + toMoneyNumber(invoice.total),
    0
  );
  const upcomingSevenDaysAppointments = await prisma.appointment.count({
    where: {
      startsAt: { gte: todayStart, lte: sevenDaysOutEnd },
      status: "SCHEDULED",
    },
  });
  const noShowRiskCount = await prisma.appointment.count({
    where: {
      status: "SCHEDULED",
      startsAt: { gte: thirtyDaysBackStart, lte: now },
    },
  });
  const appointmentUtilizationByDayMap = new Map<string, number>();
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const day = subDays(now, -dayOffset);
    const key = day.toISOString().slice(0, 10);
    appointmentUtilizationByDayMap.set(key, 0);
  }
  const nextWeekAppointments = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: todayStart, lte: sevenDaysOutEnd },
    },
    select: { startsAt: true },
  });
  for (const appointment of nextWeekAppointments) {
    const key = appointment.startsAt.toISOString().slice(0, 10);
    if (appointmentUtilizationByDayMap.has(key)) {
      appointmentUtilizationByDayMap.set(
        key,
        (appointmentUtilizationByDayMap.get(key) ?? 0) + 1
      );
    }
  }
  const appointmentUtilizationByDay = [...appointmentUtilizationByDayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, count }));

  return NextResponse.json({
    analytics: {
      totals: {
        invoicesCount: invoices.length,
        customersCount: totalCustomers,
        paymentsReceived: totalRevenue,
        outstandingAmount: outstandingInvoiceTotal,
      },
      revenueByDay,
      topServices,
      appointmentUtilizationByDay,
      outstandingInvoiceTotal,
      upcomingSevenDaysAppointments,
      noShowRiskCount,
      queuedNotifications: queuedNotificationsCount,
      topServiceName: topServices[0]?.serviceName ?? null,
    },
  });
}
