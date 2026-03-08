import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const modules = await (prisma as any).systemModule.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(modules);
    } catch (error) {
        console.error("[MODULES_GET_ERROR]", error);
        // Fallback: Retornar lista padrão se o banco falhar para não quebrar a UI
        const defaultModules = [
            { key: 'clientes', name: 'Clientes', enabled: true },
            { key: 'financeiro', name: 'Financeiro', enabled: true },
            { key: 'projetos', name: 'Projetos', enabled: true },
            { key: 'servicos', name: 'Serviços', enabled: true },
            { key: 'agenda', name: 'Agenda', enabled: true },
            { key: 'usuarios', name: 'Usuários', enabled: true },
            { key: 'whatsapp', name: 'WhatsApp', enabled: true },
        ];
        return NextResponse.json(defaultModules);
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { key, enabled } = await req.json();

        const updated = await (prisma as any).systemModule.update({
            where: { key },
            data: { enabled }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[MODULES_POST_ERROR]", error);
        return NextResponse.json({ error: "Erro ao atualizar módulo" }, { status: 500 });
    }
}
