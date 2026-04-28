import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { sendNfseEmail } from '@/lib/financeiro/nfse/send-email';
import { getActiveNfseProvider } from '@/lib/financeiro/nfse/factory';
import { fetchNfsePdf } from '@/lib/financeiro/nfse/fetch-pdf';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const record = await prisma.nfseRecord.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    if (record.status !== 'emitida' || !record.numeroNfse) {
        return NextResponse.json({ error: 'NFS-e ainda não foi emitida' }, { status: 400 });
    }

    const nfseProvider = await getActiveNfseProvider();

    try {
        // XML sempre anexamos se disponível
        const xmlContent = record.xmlRetorno;
        let pdfBuffer: Buffer | null = null;

        // Tentar baixar o PDF oficial do GINFES para anexo
        try {
            const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
            if (config && record.numeroNfse && record.codigoVerificacao) {
                const sub = 'visualizar';
                const cleanCnpj = config.cnpj.replace(/\D/g, '');
                const maskedCnpj = cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
                const pdfUrl = `https://${sub}.ginfes.com.br/report/consultarNota?__report=nfs_ver4RT&cnpjPrestador=${maskedCnpj}&numNota=${record.numeroNfse}&cdVerificacao=${record.codigoVerificacao}&__format=pdf`;
                
                pdfBuffer = await fetchNfsePdf(pdfUrl).catch(e => {
                    console.warn('[PDF_FETCH_ERROR_INTERNAL]', e.message);
                    return null;
                });
            }
        } catch (e) {
            console.warn('[PDF_FETCH_ERROR]', e);
        }
        
        await sendNfseEmail({
            clientId: record.clientId,
            tomadorNome: record.tomadorNome,
            valorServicos: record.valorServicos,
            discriminacao: record.discriminacao,
            numeroNfse: record.numeroNfse,
            codigoVerificacao: record.codigoVerificacao,
            provider: nfseProvider?.provider || 'ginfes',
            xmlContent: xmlContent,
            pdfBuffer: pdfBuffer,
            nfseId: record.id,
            overrideEmail: record.tomadorEmail
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[SEND_EMAIL_ROUTE_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
