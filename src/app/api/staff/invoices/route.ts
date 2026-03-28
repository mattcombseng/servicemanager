import { NextResponse } from "next/server";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseDateInput,
  parseMoney,
  toMoneyNumber,
} from "@/lib/format";
import { requireStaff } from "@/lib/session";
import {
  invoiceCreateSchema,
  invoiceStatusUpdateSchema,
} from "@/lib/validation";

export async function GET() {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const invoices = await prisma.invoice.findMany({
    include: {
      customer: true,
      lineItems: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      customerName: invoice.customer.name,
      issuedAt: invoice.issuedAt.toISOString(),
      dueAt: invoice.dueAt.toISOString(),
      subtotal: toMoneyNumber(invoice.subtotal),
      taxAmount: toMoneyNumber(invoice.taxAmount),
      total: toMoneyNumber(invoice.total),
      status: invoice.status,
      notes: invoice.notes,
    })),
  });
}

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const issuedDate = parseDateInput(parsed.data.issuedAt);
  const dueDate = parseDateInput(parsed.data.dueAt);
  if (!issuedDate || !dueDate) {
    return NextResponse.json(
      { error: "Invalid issued or due date." },
      { status: 400 }
    );
  }

  const safeQuantity = Math.max(1, parsed.data.quantity);
  const subtotal = parsed.data.unitPrice * safeQuantity;
  const taxAmount = subtotal * (parsed.data.taxRatePercent / 100);
  const total = subtotal + taxAmount;

  const invoice = await prisma.invoice.create({
    data: {
      customerId: parsed.data.customerId,
      serviceId: parsed.data.serviceId,
      issuedAt: issuedDate,
      dueAt: dueDate,
      subtotal: parseMoney(subtotal),
      taxAmount: parseMoney(taxAmount),
      total: parseMoney(total),
      status: InvoiceStatus.DRAFT,
      notes: parsed.data.notes || null,
      createdByStaffId: gate.session.user.id,
      lineItems: {
        create: {
          description: parsed.data.lineDescription,
          quantity: safeQuantity,
          unitPrice: parseMoney(parsed.data.unitPrice),
          serviceId: parsed.data.serviceId,
        },
      },
    },
    include: {
      customer: true,
    },
  });

  return NextResponse.json(
    {
      invoice: {
        id: invoice.id,
        customerName: invoice.customer.name,
        total: toMoneyNumber(invoice.total),
        status: invoice.status,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const parsed = invoiceStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const invoice = await prisma.invoice.update({
    where: { id: parsed.data.invoiceId },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  });

  return NextResponse.json({ invoice });
}
