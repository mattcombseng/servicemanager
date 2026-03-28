import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { serviceCreateSchema } from "@/lib/validation";

export async function GET() {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  const json = await request.json();
  const parsed = serviceCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const service = await prisma.service.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      defaultRate: new Prisma.Decimal(parsed.data.defaultRate.toFixed(2)),
      durationMinutes: parsed.data.durationMinutes,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
