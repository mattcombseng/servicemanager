import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseMoney } from "@/lib/format";
import { hashToken } from "@/lib/tokens";
import { queuePaymentReceivedNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "Missing payment token" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const paymentLink = await prisma.paymentLink.findUnique({
    where: { tokenHash },
    include: {
      invoice: {
        include: {
          customer: true,
        },
      },
    },
  });

  if (!paymentLink) {
    return NextResponse.json({ error: "Invalid payment token" }, { status: 404 });
  }
  if (paymentLink.status === PaymentStatus.SUCCEEDED) {
    return NextResponse.json({ ok: true, message: "Payment already processed." });
  }
  if (paymentLink.expiresAt < new Date()) {
    return NextResponse.json({ error: "Payment link has expired." }, { status: 400 });
  }

  const now = new Date();
  const amount = Number(paymentLink.amount.toString());
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId: paymentLink.invoiceId,
        paymentLinkId: paymentLink.id,
        amount: parseMoney(amount),
        status: PaymentStatus.SUCCEEDED,
        provider: paymentLink.provider,
        paidAt: now,
        externalRef: `sim-${Date.now()}`,
      },
    });

    await tx.paymentLink.update({
      where: { id: paymentLink.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: now,
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
    message: "Payment simulated successfully.",
    paymentId: payment.id,
  });
}
