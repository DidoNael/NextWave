import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// API de pré-login: verifica credenciais e retorna se 2FA é necessário
// Isso contorna a limitação do Auth.js v5 que engole erros customizados
export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Credenciais incompletas" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: String(email) },
        });

        if (!user || !user.password) {
            return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(String(password), user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });
        }

        // Credenciais válidas — verificar se precisa de 2FA
        if (user.twoFactorEnabled) {
            return NextResponse.json({
                requires2FA: true,
                message: "Autenticação de dois fatores necessária"
            });
        }

        // Não precisa de 2FA, login pode prosseguir normalmente
        return NextResponse.json({
            requires2FA: false,
            message: "Credenciais válidas"
        });
    } catch (error) {
        console.error("[PRE_LOGIN_ERROR]", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
