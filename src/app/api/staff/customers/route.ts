import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { customerCreateSchema } from "@/lib/validation";

export async function GET() {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid customer payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.create({
    data: parsed.data,
  });

  return NextResponse.json({ customer }, { status: 201 });
}
