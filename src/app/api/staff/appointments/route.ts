import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import {
  parseDateTimeInput,
} from "@/lib/format";
import { staffAppointmentCreateSchema } from "@/lib/validation";

export async function GET() {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const appointments = await prisma.appointment.findMany({
    orderBy: { startsAt: "asc" },
    include: {
      customer: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      customerId: appointment.customerId,
      serviceId: appointment.serviceId,
      startsAt: appointment.startsAt.toISOString(),
      notes: appointment.notes,
      status: appointment.status,
      customerName: appointment.customer.name,
      serviceName: appointment.service.name,
    })),
  });
}

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const parsed = staffAppointmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid appointment payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const startsAt = parseDateTimeInput(parsed.data.startsAt);
  if (!startsAt) {
    return NextResponse.json(
      { error: "Invalid appointment date/time format." },
      { status: 400 }
    );
  }

  const appointment = await prisma.appointment.create({
    data: {
      customerId: parsed.data.customerId,
      serviceId: parsed.data.serviceId,
      startsAt,
      notes: parsed.data.notes,
      createdByStaffId: gate.session.user.id,
    },
    include: {
      customer: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    {
      appointment: {
        id: appointment.id,
        customerId: appointment.customerId,
        serviceId: appointment.serviceId,
        startsAt: appointment.startsAt.toISOString(),
        notes: appointment.notes,
        status: appointment.status,
        customerName: appointment.customer.name,
        serviceName: appointment.service.name,
      },
    },
    { status: 201 }
  );
}
