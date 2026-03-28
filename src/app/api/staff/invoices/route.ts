import { NextResponse } from "next/server";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createToken, hashToken } from "@/lib/tokens";
import {
  formatCurrency,
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
      paymentLinks: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      payments: {
        where: { status: "SUCCEEDED" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return NextResponse.json({
    invoices: invoices.map((invoice) => {
      const latestPaymentLink = invoice.paymentLinks[0] ?? null;
      return {
        id: invoice.id,
        customerName: invoice.customer.name,
        issuedAt: invoice.issuedAt.toISOString(),
        dueAt: invoice.dueAt.toISOString(),
        subtotal: toMoneyNumber(invoice.subtotal),
        taxAmount: toMoneyNumber(invoice.taxAmount),
        total: toMoneyNumber(invoice.total),
        status: invoice.status,
        notes: invoice.notes,
        paymentStatus: latestPaymentLink?.status ?? null,
        paymentLinkUrl: latestPaymentLink
          ? `${baseUrl}/api/staff/payments/webhook/simulate?paymentLinkId=${latestPaymentLink.id}`
          : null,
        paidAmount: invoice.payments.reduce(
          (sum, payment) => sum + toMoneyNumber(payment.amount),
          0
        ),
      };
    }),
    payments: invoices
      .flatMap((invoice) =>
        invoice.payments.map((payment) => ({
          id: payment.id,
          invoiceId: invoice.id,
          invoiceCustomerName: invoice.customer.name,
          amount: toMoneyNumber(payment.amount),
          status: payment.status,
          createdAt: payment.createdAt.toISOString(),
        }))
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50),
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

  if (parsed.data.status === "SENT") {
    const detailed = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
      include: {
        customer: true,
      },
    });

    if (detailed?.customer.email) {
      await prisma.notificationEvent.create({
        data: {
          type: "INVOICE_DUE",
          customerId: detailed.customerId,
          invoiceId: detailed.id,
          subject: `Invoice sent (${detailed.id.slice(0, 8)})`,
          body: `Your invoice total is ${formatCurrency(
            toMoneyNumber(detailed.total)
          )} and is due on ${detailed.dueAt.toLocaleDateString()}.`,
          metadata: {
            trigger: "invoice_status_sent",
          },
        },
      });
    }
  }

  return NextResponse.json({ invoice });
}

export async function PUT(request: Request) {
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

  if (parsed.data.status !== "PAID") {
    return NextResponse.json(
      { error: "PUT is reserved for webhook-simulated payment processing." },
      { status: 400 }
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.data.invoiceId },
    select: { id: true, total: true, status: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const rawToken = createToken();
  const tokenHash = hashToken(rawToken);
  const paymentLink = await prisma.paymentLink.create({
    data: {
      invoiceId: invoice.id,
      tokenHash,
      amount: invoice.total,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByStaffId: gate.session.user.id,
    },
    select: { id: true },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return NextResponse.json({
    paymentUrl: `${baseUrl}/api/staff/payments/webhook/simulate?token=${rawToken}`,
    paymentLinkId: paymentLink.id,
  });
}
