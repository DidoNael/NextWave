import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name, subject, body, isDefault } = await req.json();

    if (isDefault) {
        await prisma.emailTemplate.updateMany({ where: { id: { not: params.id } }, data: { isDefault: false } });
    }

    const template = await prisma.emailTemplate.update({
        where: { id: params.id },
        data: { name, subject, body, isDefault: !!isDefault },
    });
    return NextResponse.json(template);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const template = await prisma.emailTemplate.findUnique({ where: { id: params.id } });
    if (template?.isDefault) {
        return NextResponse.json({ error: 'Não é possível excluir o template padrão' }, { status: 400 });
    }

    await prisma.emailTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}
