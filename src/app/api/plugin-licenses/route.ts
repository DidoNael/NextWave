import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createPluginLicense } from "@/lib/license";

export async function GET() {
  const session = await auth();
  const orgId = (session?.user as any)?.organizationId;
  if (!session || session.user?.role !== "master" || !orgId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const licenses = await prisma.pluginLicense.findMany({ 
    where: { organizationId: orgId },
    include: { service: { select: { title: true } } },
    orderBy: { createdAt: "desc" } 
  });
  return NextResponse.json(licenses);
}

export async function POST(req: Request) {
  const session = await auth();
  const orgId = (session?.user as any)?.organizationId;
  if (!session || session.user?.role !== "master" || !orgId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();

  try {
    const license = await createPluginLicense({
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      organizationId: orgId,
      isTrial: !!body.isTrial,
      trialDays: Number(body.trialDays) || 3,
    });

    return NextResponse.json(license, { status: 201 });
  } catch (err) {
    console.error("[LICENSES_POST] Prisma error:", err);
    return NextResponse.json({ error: "Erro interno ao criar licença" }, { status: 500 });
  }
}
