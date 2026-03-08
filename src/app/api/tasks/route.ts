import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const { title, description, priority, columnId, order } = await req.json();

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
            },
        });

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
        const { id, title, description, priority, columnId, order } = body;

        if (!id) return NextResponse.json({ error: "ID da tarefa é obrigatório" }, { status: 400 });

        const task = await prisma.task.update({
            where: { id },
            data: {
                title,
                description,
                priority,
                columnId,
                order,
            },
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error("[TASK_PATCH_ERROR]", error);
        return NextResponse.json({ error: "Erro ao atualizar tarefa" }, { status: 500 });
    }
}
