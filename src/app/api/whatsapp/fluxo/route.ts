import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!session?.user?.id || !organizationId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const flows = await prisma.whatsAppFlow.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(flows);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar fluxos" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!session?.user?.id || !organizationId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { name, nodes, edges, isActive } = await req.json();

        const flow = await prisma.whatsAppFlow.create({
            data: {
                name: name || "Novo Fluxo",
                nodes: nodes || [],
                edges: edges || [],
                isActive: isActive || false,
                organizationId: organizationId
            }
        });

        return NextResponse.json(flow);
    } catch (error) {
        console.error("[WHATSAPP_FLOW_POST]", error);
        return NextResponse.json({ error: "Erro ao criar fluxo" }, { status: 500 });
    }
}
