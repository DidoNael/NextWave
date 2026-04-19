import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// DELETE /api/nfse/limpar — exclui TODOS os registros pendente/erro
export async function DELETE(_req: Request) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { count } = await prisma.nfseRecord.deleteMany({
        where: { status: { in: ['pendente', 'erro'] } },
    });

    return NextResponse.json({ ok: true, removidos: count });
}
