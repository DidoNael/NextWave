import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assigneeId = searchParams.get("assigneeId");
    const priority = searchParams.get("priority");
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");

    const tasks = await prisma.task.findMany({
      where: {
        AND: [
          assigneeId ? { assigneeId } : {},
          priority ? { priority } : {},
          projectId ? { projectId } : {},
          clientId ? { clientId } : {},
        ],
      },
      include: {
        assignee: { select: { name: true, avatar: true } },
        client: { select: { name: true } },
        project: { select: { name: true, color: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[TAREFAS_GET]", error);
    return new NextResponse("Erro Interno", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const body = await req.json();
    const { title, description, priority, dueDate, assigneeId, clientId, projectId, status } = body;

    if (!title) {
      return new NextResponse("Título é obrigatório", { status: 400 });
    }

    // Buscar maior ordem para a coluna atual (status)
    const lastTask = await prisma.task.findFirst({
      where: { status: status || "A Fazer" },
      orderBy: { order: "desc" },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "media",
        status: status || "A Fazer",
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: session.user.id,
        assigneeId,
        clientId,
        projectId,
        order: lastTask ? lastTask.order + 1 : 0,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TAREFAS_POST]", error);
    return new NextResponse("Erro Interno", { status: 500 });
  }
}
