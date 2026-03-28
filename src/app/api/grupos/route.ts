import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isMasterOrAdmin(role?: string) {
  return role === "master" || role === "admin";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isMasterOrAdmin(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const grupos = await (prisma as any).userGroup.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json(grupos);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !isMasterOrAdmin(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { name, description, allowedIps, permissions } = await req.json();
  if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  try {
    const grupo = await (prisma as any).userGroup.create({
      data: {
        name,
        description: description || null,
        allowedIps: allowedIps || "*",
        permissions: JSON.stringify(permissions || {}),
      },
    });
    return NextResponse.json(grupo, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Já existe um grupo com esse nome" }, { status: 400 });
    return NextResponse.json({ error: "Erro ao criar grupo" }, { status: 500 });
  }
}
