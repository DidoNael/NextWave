import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { randomBytes } from "crypto";

function generateKey(): string {
  return "NSTM-" + randomBytes(16).toString("hex");
}

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "master") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const licenses = await prisma.pluginLicense.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(licenses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "master") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();

  // Se for trial, calcula trialEndsAt automaticamente
  let trialEndsAt: Date | null = null;
  if (body.isTrial) {
    const days = Number(body.trialDays) || 3;
    trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + days);
  }

  try {
    const license = await prisma.pluginLicense.create({
      data: {
        key: generateKey(),
        customerName: body.customerName,
        customerEmail: body.customerEmail || null,
        status: "active",
        isTrial: !!body.isTrial,
        trialEndsAt,
        expiresAt: !body.isTrial && body.expiresAt ? new Date(body.expiresAt) : null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(license, { status: 201 });
  } catch (err) {
    console.error("[LICENSES_POST] Prisma error:", err);
    return NextResponse.json({ error: "Erro interno ao criar licença" }, { status: 500 });
  }
}
