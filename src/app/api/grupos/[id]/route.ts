import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isMasterOrAdmin(role?: string) {
  return role === "master" || role === "admin";
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id || !isMasterOrAdmin(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { name, description, allowedIps, permissions } = await req.json();
  try {
    const grupo = await (prisma as any).userGroup.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
        allowedIps: allowedIps || "*",
        permissions: JSON.stringify(permissions || {}),
      },
    });
    return NextResponse.json(grupo);
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Já existe um grupo com esse nome" }, { status: 400 });
    return NextResponse.json({ error: "Erro ao atualizar grupo" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id || !isMasterOrAdmin(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  // Desvincula usuários antes de deletar
  await (prisma as any).user.updateMany({ where: { groupId: params.id }, data: { groupId: null } });
  await (prisma as any).userGroup.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
