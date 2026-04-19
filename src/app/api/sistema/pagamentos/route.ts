import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const configs = await prisma.paymentGatewayConfig.findMany();
        return NextResponse.json(configs);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const body = await req.json();
        const { provider, name, credentials, isActive } = body;

        // Se estiver ativando este, desativa os outros para manter apenas um ativo (ou permite múltiplos no futuro)
        if (isActive) {
            await prisma.paymentGatewayConfig.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            });
        }

        const config = await prisma.paymentGatewayConfig.upsert({
            where: { provider },
            update: {
                name,
                credentials: typeof credentials === 'string' ? credentials : JSON.stringify(credentials),
                isActive
            },
            create: {
                provider,
                name,
                credentials: typeof credentials === 'string' ? credentials : JSON.stringify(credentials),
                isActive
            }
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error("[GATEWAY_CONFIG_POST_ERROR]", error);
        return NextResponse.json({ error: "Erro ao salvar configuração" }, { status: 500 });
    }
}
