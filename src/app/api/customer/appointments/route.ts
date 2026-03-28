import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/session";
import {
  parseDateTimeInput,
  toMoneyNumber,
} from "@/lib/format";
import { customerAppointmentCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const gate = await requireCustomer();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const parsed = customerAppointmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { userId: gate.session.user.id },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });
  }

  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId },
  });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const startsAt = parseDateTimeInput(parsed.data.startsAt);
  if (!startsAt) {
    return NextResponse.json(
      { error: "Invalid appointment date/time format" },
      { status: 400 }
    );
  }

  const appointment = await prisma.appointment.create({
    data: {
      customerId: customer.id,
      serviceId: parsed.data.serviceId,
      startsAt,
      notes: parsed.data.notes,
      status: "SCHEDULED",
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      customerId: customer.id,
      serviceId: service.id,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      subtotal: service.defaultRate,
      taxAmount: 0,
      total: service.defaultRate,
      status: "DRAFT",
      notes: "Auto-generated from customer self-booking.",
      lineItems: {
        create: {
          description: `${service.name} service`,
          quantity: 1,
          unitPrice: service.defaultRate,
          serviceId: service.id,
        },
      },
    },
    include: {
      lineItems: true,
    },
  });

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      startsAt: appointment.startsAt.toISOString(),
      notes: appointment.notes,
      status: appointment.status,
      serviceName: service.name,
    },
    invoice: {
      id: invoice.id,
      status: invoice.status,
      total: toMoneyNumber(invoice.total),
    },
  });
}

export async function GET() {
  const gate = await requireCustomer();
  if (!gate.ok) return gate.response;

  const customer = await prisma.customer.findUnique({
    where: { userId: gate.session.user.id },
    select: { id: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });
  }

  const [services, appointments] = await Promise.all([
    prisma.service.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.appointment.findMany({
      where: { customerId: customer.id },
      orderBy: { startsAt: "asc" },
      include: {
        service: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      defaultRate: toMoneyNumber(service.defaultRate),
      durationMinutes: service.durationMinutes,
    })),
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      startsAt: appointment.startsAt.toISOString(),
      status: appointment.status,
      notes: appointment.notes,
      serviceName: appointment.service.name,
    })),
  });
}
