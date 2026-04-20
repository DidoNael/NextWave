import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { syncToAgenda } from "@/lib/agenda-sync";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const organizationId = (session.user as any).organizationId;
    if (!organizationId) return NextResponse.json({ error: "Organização não encontrada" }, { status: 403 });

    try {
        const projects = await prisma.project.findMany({
            where: { organizationId },
            include: {
                _count: {
                    select: { columns: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(projects);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar projetos" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const organizationId = (session.user as any).organizationId;
    if (!organizationId) return NextResponse.json({ error: "Organização não encontrada" }, { status: 403 });

    try {
        const { name, description, color, dueDate } = await req.json();

        const project = await prisma.project.create({
            data: {
                name,
                description,
                color: color || "#3b82f6",
                dueDate: dueDate ? new Date(dueDate) : null,
                userId: session.user.id,
                organizationId: organizationId,
                columns: {
                    create: [
                        { title: "A Fazer", order: 0 },
                        { title: "Em Andamento", order: 1 },
                        { title: "Concluído", order: 2 },
                    ]
                }
            },
            include: {
                columns: true
            }
        });

        if (project.dueDate) {
            await syncToAgenda({
                type: "project",
                id: project.id,
                title: project.name,
                description: project.description || undefined,
                dueDate: project.dueDate,
                userId: session.user.id,
            });
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error("[PROJECT_POST_ERROR]", error);
        return NextResponse.json({ error: "Erro ao criar projeto" }, { status: 500 });
    }
}
