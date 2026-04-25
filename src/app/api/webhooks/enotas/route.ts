import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/webhooks/enotas
 *
 * Recebe notificações do eNotas quando o status de uma NFS-e muda.
 * Configurar esta URL no painel eNotas em: Configurações → Webhook.
 *
 * Payload esperado: { id, externalId, status, numero, mensagemErro? }
 * Status eNotas: "Aguardando" | "Autorizada" | "Cancelada" | "Erro" | "Negada"
 */
export async function POST(req: Request) {
    let payload: any;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const { id: enotasId, status, numero, mensagemErro } = payload;

    if (!enotasId || !status) {
        return NextResponse.json({ error: 'Campos obrigatórios: id, status' }, { status: 400 });
    }

    // Buscar o registro pelo protocolo (que guarda o ID interno do eNotas)
    const record = await prisma.nfseRecord.findFirst({
        where: { protocolo: enotasId },
    });

    if (!record) {
        // Pode ser um webhook duplicado ou de outra empresa — ignorar silenciosamente
        return NextResponse.json({ ok: true, message: 'Registro não encontrado, ignorado.' });
    }

    // Status já terminal — não reprocessar
    if (['emitida', 'cancelada'].includes(record.status)) {
        return NextResponse.json({ ok: true, message: 'Status já terminal.' });
    }

    switch (status) {
        case 'Autorizada':
            await prisma.nfseRecord.update({
                where: { id: record.id },
                data: {
                    status: 'emitida',
                    numeroNfse: numero ? String(numero) : null,
                    emitidaEm: new Date(),
                    xmlRetorno: JSON.stringify(payload),
                },
            });
            break;

        case 'Cancelada':
            await prisma.nfseRecord.update({
                where: { id: record.id },
                data: {
                    status: 'cancelada',
                    canceladaEm: new Date(),
                    xmlRetorno: JSON.stringify(payload),
                },
            });
            break;

        case 'Erro':
        case 'Negada':
            await prisma.nfseRecord.update({
                where: { id: record.id },
                data: {
                    status: 'erro',
                    errorMessage: mensagemErro || `eNotas status: ${status}`,
                    xmlRetorno: JSON.stringify(payload),
                },
            });
            break;

        default:
            // "Aguardando" e outros: apenas atualiza o xmlRetorno para debug
            await prisma.nfseRecord.update({
                where: { id: record.id },
                data: { xmlRetorno: JSON.stringify(payload) },
            });
    }

    return NextResponse.json({ ok: true });
}
