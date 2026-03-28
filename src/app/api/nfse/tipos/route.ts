import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const tipos = await prisma.nfseTipoServico.findMany({ orderBy: [{ isDefault: 'desc' }, { nome: 'asc' }] });
    return NextResponse.json(tipos);
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { nome, itemListaServico, aliquotaIss, issRetido, naturezaOperacao, discriminacaoModelo, isDefault } = body;

    if (!nome || !itemListaServico || aliquotaIss == null) {
        return NextResponse.json({ error: 'nome, itemListaServico e aliquotaIss são obrigatórios' }, { status: 400 });
    }

    // Se marcado como padrão, desmarcar os outros
    if (isDefault) {
        await prisma.nfseTipoServico.updateMany({ data: { isDefault: false } });
    }

    const tipo = await prisma.nfseTipoServico.create({
        data: { nome, itemListaServico, aliquotaIss: Number(aliquotaIss), issRetido: issRetido || '2', naturezaOperacao: naturezaOperacao || '1', discriminacaoModelo: discriminacaoModelo || null, isDefault: !!isDefault },
    });

    return NextResponse.json(tipo, { status: 201 });
}
