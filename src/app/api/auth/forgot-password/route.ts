import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTokenHash, createTokenValue } from "@/lib/tokens";
import { forgotPasswordSchema } from "@/lib/validation";

const RESET_TOKEN_TTL_MINUTES = 60;

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    // Return generic response to avoid account enumeration.
    if (!user?.email) {
      return NextResponse.json({ ok: true });
    }

    const token = createTokenValue();
    const tokenHash = createTokenHash(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // In a production system, send this token via email.
    return NextResponse.json({
      ok: true,
      resetToken: token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate reset token." },
      { status: 500 }
    );
  }
}
