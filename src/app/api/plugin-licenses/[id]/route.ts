import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { logLicenseEvent } from "@/lib/license-log";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user?.role !== "master") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const isReactivating = body.status === "active";

  const current = await prisma.pluginLicense.findUnique({
    where: { id: params.id },
    select: { status: true },
  });

  const license = await prisma.pluginLicense.update({
    where: { id: params.id },
    data: {
      status: body.status,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      notes: body.notes,
      ...(body.graceDays !== undefined && { graceDays: Number(body.graceDays) }),
      ...(isReactivating && { overdueDetectedAt: null, lastWarningAt: null }),
    },
  });

  if (body.status && body.status !== current?.status) {
    await logLicenseEvent({
      licenseId: params.id,
      event: "status_changed",
      fromStatus: current?.status,
      toStatus: body.status,
      description: `Status alterado manualmente para "${body.status}".`,
      actor: session.user.id ?? "admin",
    });
  }

  return NextResponse.json(license);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user?.role !== "master") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  await prisma.pluginLicense.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
