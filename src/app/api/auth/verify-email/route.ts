import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { verifyEmailSchema } from "@/lib/validation";

async function verifyEmailToken(token: string) {
  const parsed = verifyEmailSchema.safeParse({ token });
  if (!parsed.success) {
    return { ok: false as const, response: NextResponse.json({ error: "Invalid token." }, { status: 400 }) };
  }

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Token is invalid or expired." },
        { status: 400 }
      ),
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true as const };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  const result = await verifyEmailToken(token);
  if (!result.ok) return result.response;
  return NextResponse.json({ success: true, message: "Email verified." });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const result = await verifyEmailToken(body?.token ?? "");
  if (!result.ok) return result.response;
  return NextResponse.json({ success: true, message: "Email verified." });
}
