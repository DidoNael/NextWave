import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID da tarefa é obrigatório" }, { status: 400 });

        await prisma.task.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[TASK_DELETE_ERROR]", error);
        return NextResponse.json({ error: "Erro ao excluir tarefa" }, { status: 500 });
    }
}
