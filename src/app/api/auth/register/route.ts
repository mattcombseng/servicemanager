import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken, createToken } from "@/lib/tokens";
import { registrationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registrationSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration payload." },
        { status: 400 }
      );
    }

    const { name, email, password, role, phone, inviteToken } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    if (role === "STAFF") {
      if (!inviteToken) {
        return NextResponse.json(
          { error: "A valid staff invite is required." },
          { status: 403 }
        );
      }

      const inviteHash = hashToken(inviteToken);
      const invite = await prisma.staffInvite.findUnique({
        where: { tokenHash: inviteHash },
        select: {
          id: true,
          email: true,
          expiresAt: true,
          usedAt: true,
        },
      });

      if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Invalid or expired staff invite." },
          { status: 403 }
        );
      }

      if (invite.email.toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { error: "Staff invite email does not match registration email." },
          { status: 403 }
        );
      }
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const verificationTokenRaw = createToken();
    const verificationTokenHash = hashToken(verificationTokenRaw);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (role === "CUSTOMER") {
        await tx.customer.create({
          data: {
            userId: createdUser.id,
            name,
            email: normalizedEmail,
            phone: phone || null,
          },
        });
      }

      if (role === "STAFF" && inviteToken) {
        await tx.staffInvite.update({
          where: { tokenHash: hashToken(inviteToken) },
          data: { usedAt: new Date() },
        });
      }

      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash: verificationTokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return createdUser;
    });

    return NextResponse.json(
      {
        user,
        verificationToken: verificationTokenRaw,
        email: normalizedEmail,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to register user." },
      { status: 500 }
    );
  }
}
