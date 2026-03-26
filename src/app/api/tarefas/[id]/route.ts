import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { title, description, priority, dueDate, assigneeId, clientId, projectId, order } = body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assigneeId,
        clientId,
        projectId,
        order,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TAREFA_PUT]", error);
    return new NextResponse("Erro Interno", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const { id } = params;

    await prisma.task.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[TAREFA_DELETE]", error);
    return new NextResponse("Erro Interno", { status: 500 });
  }
}
