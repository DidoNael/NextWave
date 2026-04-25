/**
 * nextRpsNumero — gera o próximo número RPS de forma atômica.
 *
 * Usa advisory lock do PostgreSQL para garantir que dois requests
 * simultâneos nunca obtenham o mesmo número (race condition).
 *
 * O lock 9001 é arbitrário e exclusivo para operações de NFS-e neste sistema.
 */

import { prisma } from '@/lib/db';

export async function nextRpsNumero(): Promise<string> {
    return prisma.$transaction(async (tx) => {
        // Advisory lock de sessão — liberado automaticamente ao fim da transação
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(9001)`;

        const last = await tx.nfseRecord.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { rpsNumero: true },
        });

        return last ? String(parseInt(last.rpsNumero) + 1) : '1';
    });
}
