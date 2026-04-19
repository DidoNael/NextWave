import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { syncToAgenda } from "@/lib/agenda-sync";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const project = await prisma.project.findFirst({
            where: {
                id: params.id
            },
            include: {
                columns: {
                    orderBy: { order: "asc" },
                    include: {
                        tasks: {
                            orderBy: { order: "asc" }
                        }
                    }
                }
            }
        });

        if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

        return NextResponse.json(project);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar projeto" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const { name, description, color, dueDate } = await req.json();

        const project = await prisma.project.update({
            where: {
                id: params.id
            },
            data: {
                name,
                description,
                color,
                dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined
            }
        });

        await syncToAgenda({
            type: "project",
            id: project.id,
            title: project.name,
            description: project.description || undefined,
            dueDate: project.dueDate,
            userId: session.user.id,
        });

        return NextResponse.json(project);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao atualizar projeto" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const project = await prisma.project.findFirst({
            where: { id: params.id }
        });

        if (project) {
            await syncToAgenda({
                type: "project",
                id: project.id,
                title: "",
                dueDate: null,
                userId: session.user.id,
            });
        }

        await prisma.project.delete({
            where: {
                id: params.id
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao excluir projeto" }, { status: 500 });
    }
}
