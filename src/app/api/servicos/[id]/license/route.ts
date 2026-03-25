import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET — busca a licença vinculada ao serviço
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const license = await prisma.pluginLicense.findUnique({ where: { serviceId: params.id } });
  return NextResponse.json(license);
}
