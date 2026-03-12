import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const subscriptions = await prisma.subscription.findMany({
            where: { userId: session.user.id },
            include: { client: true },
            orderBy: { nextBillingDate: "asc" }
        });
        return NextResponse.json(subscriptions);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar assinaturas" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        const body = await req.json();
        const { clientId, amount, description, interval, nextBillingDate } = body;

        const subscription = await prisma.subscription.create({
            data: {
                description,
                amount,
                interval,
                nextBillingDate: new Date(nextBillingDate),
                status: "active",
                user: { connect: { id: session.user.id } },
                client: { connect: { id: clientId } }
            }
        });

        return NextResponse.json(subscription);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao criar assinatura" }, { status: 500 });
    }
}
