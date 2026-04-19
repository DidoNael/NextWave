import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// DELETE /api/nfse/[id]/excluir — exclui registro pendente ou erro (nunca emitidas/canceladas)
export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const record = await prisma.nfseRecord.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    if (!['pendente', 'erro'].includes(record.status)) {
        return NextResponse.json(
            { error: 'Apenas registros pendentes ou com erro podem ser excluídos' },
            { status: 400 }
        );
    }

    await prisma.nfseRecord.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
}
