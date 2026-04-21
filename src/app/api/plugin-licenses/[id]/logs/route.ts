import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user?.role !== "master") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const logs = await prisma.pluginLicenseLog.findMany({
    where: { licenseId: params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(logs);
}
