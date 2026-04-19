import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
    const session = await auth();
    if (!session || session.user?.role !== "master") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const [branding, license] = await Promise.all([
            prisma.systemBranding.findFirst({ where: { id: "default" } }),
            prisma.systemLicense.findFirst({ where: { id: "default" } })
        ]);

        return NextResponse.json({ branding, license });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao carregar dados" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user?.role !== "master") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { branding, license } = body;

        if (branding) {
            await prisma.systemBranding.upsert({
                where: { id: "default" },
                update: branding,
                create: { ...branding, id: "default" }
            });
        }

        if (license) {
            await prisma.systemLicense.upsert({
                where: { id: "default" },
                update: license,
                create: { ...license, id: "default" }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao salvar dados" }, { status: 500 });
    }
}
