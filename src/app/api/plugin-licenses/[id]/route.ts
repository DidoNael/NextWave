import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user?.role !== "master") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const license = await prisma.pluginLicense.update({
    where: { id: params.id },
    data: {
      status: body.status,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      notes: body.notes,
    },
  });
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
