import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const templates = await prisma.emailTemplate.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
    return NextResponse.json(templates);
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { name, subject, body, isDefault } = await req.json();
    if (!name || !subject || !body) {
        return NextResponse.json({ error: 'name, subject e body são obrigatórios' }, { status: 400 });
    }

    if (isDefault) {
        await prisma.emailTemplate.updateMany({ data: { isDefault: false } });
    }

    const template = await prisma.emailTemplate.create({
        data: { name, subject, body, isDefault: !!isDefault },
    });
    return NextResponse.json(template, { status: 201 });
}
