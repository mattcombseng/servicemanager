import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { staffInviteCreateSchema } from "@/lib/validation";
import {
  createToken,
  hashToken,
  staffInviteExpiry,
} from "@/lib/tokens";

export async function GET() {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const invites = await prisma.staffInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      expiresAt: true,
      usedAt: true,
      createdAt: true,
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt.toISOString(),
      usedAt: invite.usedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
      invitedBy: invite.invitedBy,
    })),
  });
}

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const parsed = staffInviteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid invite payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const daysValid = parsed.data.daysValid ?? 7;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user already exists with this email." },
      { status: 409 }
    );
  }

  const token = createToken();
  const tokenHash = hashToken(token);

  await prisma.staffInvite.create({
    data: {
      email,
      tokenHash,
      invitedByUserId: gate.session.user.id,
      expiresAt: staffInviteExpiry(daysValid),
    },
  });

  // Return invite URL directly for now; in production, send via email provider.
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/register?role=staff&invite=${encodeURIComponent(token)}`;

  return NextResponse.json({
    inviteUrl,
  }, { status: 201 });
}
