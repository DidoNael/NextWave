import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const logs = await prisma.fiscalLog.findMany({
        where: { nfseId: params.id },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(logs);
}
