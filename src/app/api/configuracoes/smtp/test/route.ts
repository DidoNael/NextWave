import { NextResponse } from "next/server";
import { auth } from "@/auth";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function POST(req: Request) {
    const session = await auth();
    const userRole = (session?.user as any)?.role?.toUpperCase();
    if (!session || (userRole !== "ADMIN" && userRole !== "MASTER")) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, host, port, user, pass, secure, fromEmail, fromName, toEmail } = body;

        if (!host || !port || !user || !pass || !fromEmail || !toEmail) {
            return NextResponse.json({ error: "Parâmetros incompletos para o teste" }, { status: 400 });
        }

        let realPass = pass;
        
        // Se estivermos testando uma configuração salva (vinda com id e placeholder)
        if (id && pass === "********") {
            const stored = await prisma.smtpConfig.findUnique({
                where: { id },
                select: { pass: true }
            });
            if (!stored) {
                return NextResponse.json({ error: "Configuração não encontrada no banco" }, { status: 404 });
            }
            realPass = decrypt(stored.pass);
        }

        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port),
            secure: !!secure,
            auth: { user, pass: realPass },
            // Timeout curto para teste
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
        });

        // Tenta verificar a conexão antes de enviar
        await transporter.verify();

        // Envia o e-mail de teste
        const info = await transporter.sendMail({
            from: `"${fromName || "Teste NextWave"}" <${fromEmail}>`,
            to: toEmail,
            subject: "Teste de Configuração SMTP - NextWave CRM",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #2563eb;">Conexão SMTP Bem-sucedida!</h2>
                    <p>Este é um e-mail de teste enviado pelo <strong>NextWave CRM</strong>.</p>
                    <p>Se você recebeu este e-mail, as configurações de SMTP estão funcionando corretamente.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="font-size: 12px; color: #64748b;">
                        Enviado em: ${new Date().toLocaleString('pt-BR')}<br>
                        Servidor: ${host}:${port}<br>
                        Usuário: ${user}
                    </p>
                </div>
            `,
        });

        return NextResponse.json({ 
            success: true, 
            messageId: info.messageId,
            response: info.response
        });
    } catch (error: any) {
        console.error("[SMTP_TEST_ERROR]", error);
        return NextResponse.json({ 
            error: error.message || "Erro desconhecido ao testar SMTP",
            code: error.code,
            command: error.command
        }, { status: 500 });
    }
}
