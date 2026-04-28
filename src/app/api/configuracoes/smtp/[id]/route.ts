import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    const userRole = (session?.user as any)?.role?.toUpperCase();
    if (!session || (userRole !== "ADMIN" && userRole !== "MASTER")) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        await prisma.smtpConfig.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[SMTP_CONFIG_DELETE]", error);
        return NextResponse.json({ error: "Erro ao excluir configuração" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    const userRole = (session?.user as any)?.role?.toUpperCase();
    if (!session || (userRole !== "ADMIN" && userRole !== "MASTER")) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        
        // Se estiver definindo como padrão, resetar os outros
        if (body.isDefault) {
            await prisma.smtpConfig.updateMany({
                data: { isDefault: false }
            });
        }

        // Sanitização dos dados para o Prisma
        const updateData: any = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.host !== undefined) updateData.host = body.host;
        if (body.port !== undefined) updateData.port = parseInt(body.port);
        if (body.user !== undefined) updateData.user = body.user;
        
        // Só atualiza a senha se ela não for o placeholder de estrelas
        if (body.pass !== undefined && body.pass !== "********") {
            updateData.pass = encrypt(body.pass);
        }
        
        if (body.fromEmail !== undefined) updateData.fromEmail = body.fromEmail;
        if (body.fromName !== undefined) updateData.fromName = body.fromName;
        if (body.secure !== undefined) updateData.secure = !!body.secure;
        if (body.isActive !== undefined) updateData.isActive = !!body.isActive;
        if (body.isDefault !== undefined) updateData.isDefault = !!body.isDefault;

        const config = await prisma.smtpConfig.update({
            where: { id: params.id },
            data: updateData
        });

        return NextResponse.json({ ...config, pass: "********" });
    } catch (error: any) {
        console.error("[SMTP_CONFIG_PATCH]", error);
        return NextResponse.json({ error: "Erro ao atualizar configuração: " + error.message }, { status: 500 });
    }
}
