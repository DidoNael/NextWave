import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const projects = await prisma.project.findMany({
            where: { userId: session.user?.id },
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
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const { name, description, color } = await req.json();

        const project = await prisma.project.create({
            data: {
                name,
                description,
                color: color || "#3b82f6",
                userId: session.user?.id!,
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

        return NextResponse.json(project);
    } catch (error) {
        console.error("[PROJECT_POST_ERROR]", error);
        return NextResponse.json({ error: "Erro ao criar projeto" }, { status: 500 });
    }
}
