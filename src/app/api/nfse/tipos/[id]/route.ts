import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { nome, itemListaServico, aliquotaIss, issRetido, naturezaOperacao, discriminacaoModelo, isDefault } = body;

    if (isDefault) {
        await prisma.nfseTipoServico.updateMany({ data: { isDefault: false } });
    }

    const tipo = await prisma.nfseTipoServico.update({
        where: { id: params.id },
        data: { nome, itemListaServico, aliquotaIss: Number(aliquotaIss), issRetido, naturezaOperacao, discriminacaoModelo: discriminacaoModelo || null, isDefault: !!isDefault },
    });

    return NextResponse.json(tipo);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await prisma.nfseTipoServico.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
}
