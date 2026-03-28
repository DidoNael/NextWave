import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await auth();
    const role = session?.user?.role?.toUpperCase();
    if (!session || (role !== "ADMIN" && role !== "MASTER")) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        let modules = await (prisma as any).systemModule.findMany({
            orderBy: { name: 'asc' }
        });

        // Se o banco estiver vazio (ex: após reset), inicializa com padrões
        if (modules.length === 0) {
            const defaultModules = [
                { key: 'clientes', name: 'Clientes', enabled: true },
                { key: 'financeiro', name: 'Financeiro', enabled: true },
                { key: 'projetos', name: 'Projetos', enabled: true },
                { key: 'servicos', name: 'Serviços', enabled: true },
                { key: 'whatsapp', name: 'WhatsApp API', enabled: true },
                { key: 'pbx', name: 'Telefonia PBX', enabled: false },
                { key: 'usuarios', name: 'Usuários', enabled: true },
                { key: 'evolution', name: 'Evolution API', enabled: false },
                { key: 'mcp', name: 'MCP Server', description: 'Integração com agentes de IA via Model Context Protocol', enabled: false },
            ];

            for (const mod of defaultModules) {
                await (prisma as any).systemModule.upsert({
                    where: { key: mod.key },
                    update: { enabled: mod.enabled },
                    create: mod
                });
            }

            modules = await (prisma as any).systemModule.findMany({
                orderBy: { name: 'asc' }
            });
        }

        return NextResponse.json(modules);
    } catch (error) {
        console.error("[MODULES_GET_ERROR]", error);
        return NextResponse.json({ error: "Erro ao buscar módulos" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    const role = session?.user?.role?.toUpperCase();
    if (!session || (role !== "ADMIN" && role !== "MASTER")) {
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
