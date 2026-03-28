import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMoney, toMoneyNumber } from "@/lib/format";
import { requireStaff } from "@/lib/session";
import { createToken, hashToken } from "@/lib/tokens";
import { paymentLinkCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const parsed = paymentLinkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payment link payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.data.invoiceId },
    select: {
      id: true,
      total: true,
      status: true,
      customer: { select: { email: true, name: true } },
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const rawToken = createToken();
  const tokenHash = hashToken(rawToken);
  const amount = parsed.data.amount
    ? parseMoney(parsed.data.amount)
    : invoice.total;
  const expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000);

  const paymentLink = await prisma.paymentLink.create({
    data: {
      invoiceId: invoice.id,
      tokenHash,
      amount,
      expiresAt,
      createdByStaffId: gate.session.user.id,
      externalRef: parsed.data.externalRef || null,
    },
    select: {
      id: true,
      invoiceId: true,
      amount: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const paymentUrl = `${baseUrl}/api/staff/payments/webhook/simulate?token=${encodeURIComponent(rawToken)}`;

  return NextResponse.json(
    {
      paymentLink: {
        ...paymentLink,
        amount: toMoneyNumber(paymentLink.amount),
        expiresAt: paymentLink.expiresAt.toISOString(),
        createdAt: paymentLink.createdAt.toISOString(),
      },
      paymentUrl,
      note: "Simulated provider link for development. Replace with Stripe checkout session in production.",
    },
    { status: 201 }
  );
}
