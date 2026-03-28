import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
    const session = await auth();

    if (!session || !["admin", "master"].includes(session.user?.role as string)) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                allowedIps: true,
                workDayStart: true,
                workDayEnd: true,
                groupId: true,
                group: { select: { id: true, name: true } },
                createdAt: true,
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("[USERS_GET_ERROR]", error);
        return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !["admin", "master"].includes(session.user?.role as string)) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, email, password, role, allowedIps, workDayStart, workDayEnd, groupId } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "user",
                groupId: groupId || null,
                allowedIps: allowedIps || "*",
                workDayStart: workDayStart || null,
                workDayEnd: workDayEnd || null,
            },
        });

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
        });
    } catch (error) {
        console.error("[USERS_POST_ERROR]", error);
        return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
    }
}
