import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { syncToAgenda } from "@/lib/agenda-sync";

export async function POST(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const { title, description, priority, scope, columnId, order, dueDate } = await req.json();

        if (!title || !columnId) {
            return NextResponse.json({ error: "Título e Coluna são obrigatórios" }, { status: 400 });
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                priority: priority || "media",
                columnId,
                order: order || 0,
                dueDate: dueDate ? new Date(dueDate) : null,
                userId: session.user.id,
            },
        });

        if (task.dueDate) {
            // Need column to get userId. Tasks don't have direct userId but Column -> Project has.
            const column = await prisma.taskColumn.findUnique({
                where: { id: columnId },
                include: { project: true }
            });
            if (column) {
                await syncToAgenda({
                    type: "task",
                    id: task.id,
                    title: task.title,
                    description: task.description || undefined,
                    dueDate: task.dueDate,
                    userId: column.project.userId,
                });
            }
        }

        return NextResponse.json(task);
    } catch (error) {
        console.error("[TASK_POST_ERROR]", error);
        return NextResponse.json({ error: "Erro ao criar tarefa" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const body = await req.json();
        const { id, title, description, priority, columnId, order, dueDate } = body;

        if (!id) return NextResponse.json({ error: "ID da tarefa é obrigatório" }, { status: 400 });

        const task = await prisma.task.update({
            where: { id },
            data: {
                title,
                description,
                priority,
                columnId,
                order,
                dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined
            },
        });

        if (task) {
            const column = await prisma.taskColumn.findUnique({
                where: { id: task.columnId ?? undefined },
                include: { project: true }
            });
            if (column) {
                await syncToAgenda({
                    type: "task",
                    id: task.id,
                    title: task.title,
                    description: task.description || undefined,
                    dueDate: task.dueDate,
                    userId: column.project.userId,
                });
            }
        }

        return NextResponse.json(task);
    } catch (error) {
        console.error("[TASK_PATCH_ERROR]", error);
        return NextResponse.json({ error: "Erro ao atualizar tarefa" }, { status: 500 });
    }
}
