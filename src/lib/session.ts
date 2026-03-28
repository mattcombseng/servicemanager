import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions, type AppRole } from "@/lib/auth";

type SessionWithRole = Session & {
  user: Session["user"] & { id: string; role: AppRole };
};

type GuardResult =
  | { ok: true; session: SessionWithRole }
  | { ok: false; response: NextResponse };

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function requireRole(role: AppRole): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) {
    return { ok: false, response: unauthorizedResponse() };
  }
  if (session.user.role !== role) {
    return { ok: false, response: forbiddenResponse() };
  }
  return {
    ok: true,
    session: session as SessionWithRole,
  };
}

export async function requireStaff() {
  return requireRole("STAFF");
}

export async function requireCustomer() {
  return requireRole("CUSTOMER");
}
