import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

// ... (Conteúdo do PUT continua abaixo)

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        notifyEmail: true,
        notifyPush: true,
        notifyDue: true,
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar perfil" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const data = await req.json();
    
    // Filtramos apenas os campos permitidos para atualização via painel de configurações
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.notifyEmail !== undefined) updateData.notifyEmail = data.notifyEmail;
    if (data.notifyPush !== undefined) updateData.notifyPush = data.notifyPush;
    if (data.notifyDue !== undefined) updateData.notifyDue = data.notifyDue;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        notifyEmail: true,
        notifyPush: true,
        notifyDue: true,
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[PERFIL_UPDATE]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar configurações" },
      { status: 500 }
    );
  }
}
