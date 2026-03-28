import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseMoney } from "@/lib/format";
import { queuePaymentReceivedNotification } from "@/lib/notifications";
import { paymentWebhookSchema } from "@/lib/validation";
import { requireStaff } from "@/lib/session";

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const body = await request.json().catch(() => null);
  const parsed = paymentWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid webhook payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const event = parsed.data;
  if (event.status !== "SUCCEEDED") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const now = new Date();
  const paymentLink = await prisma.paymentLink.findUnique({
    where: { id: event.paymentLinkId },
    include: {
      invoice: {
        include: {
          customer: true,
        },
      },
    },
  });

  if (!paymentLink) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }

  const amount = event.amount ?? Number(paymentLink.amount.toString());

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId: paymentLink.invoiceId,
        paymentLinkId: paymentLink.id,
        amount: parseMoney(amount),
        status: PaymentStatus.SUCCEEDED,
        provider: paymentLink.provider,
        paidAt: now,
        externalRef: event.externalRef ?? null,
      },
    });

    await tx.paymentLink.update({
      where: { id: paymentLink.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: now,
        externalRef: event.externalRef ?? paymentLink.externalRef,
      },
    });

    await tx.invoice.update({
      where: { id: paymentLink.invoiceId },
      data: { status: "PAID" },
    });

    return created;
  });

  await queuePaymentReceivedNotification(prisma, {
    customerId: paymentLink.invoice.customerId,
    invoiceId: paymentLink.invoiceId,
    customerName: paymentLink.invoice.customer.name,
    amount,
  });

  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
    invoiceId: paymentLink.invoiceId,
  });
}
