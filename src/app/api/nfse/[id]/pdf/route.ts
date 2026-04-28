import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { fetchNfsePdf } from '@/lib/financeiro/nfse/fetch-pdf';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        const record = await prisma.nfseRecord.findUnique({
            where: { id: params.id }
        });

        if (!record) {
            return NextResponse.json({ error: 'NFS-e não encontrada' }, { status: 404 });
        }

        let pdfUrl = '';

        // Se não tiver URL, mas tivermos os dados necessários para GINFES, construímos
        if (!pdfUrl) {
            let codigoVerificacao = record.codigoVerificacao;
            
            // Tenta recuperar do XML se estiver faltando no banco
            if (!codigoVerificacao && record.xmlRetorno) {
                let xml = record.xmlRetorno;
                
                // Se o XML estiver escapado (comum em respostas SOAP), desescapamos o básico para o regex
                if (xml.includes('&lt;')) {
                    xml = xml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
                }

                // Regex ultra-agressiva: ignora namespace, ignora case e busca o valor entre as tags
                const match = xml.match(/<(?:\w+:)?CodigoVerificacao>(.*?)<\/(?:\w+:)?CodigoVerificacao>/i);
                codigoVerificacao = match?.[1] ?? null;

                // Segunda tentativa: busca qualquer tag que termine em CodigoVerificacao
                if (!codigoVerificacao) {
                    const matchFallback = xml.match(/<\w*?CodigoVerificacao>(.*?)<\/\w*?CodigoVerificacao>/i);
                    codigoVerificacao = matchFallback?.[1] ?? null;
                }
            }

            if (record.numeroNfse && codigoVerificacao) {
                const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
                if (config) {
                    const sub = 'visualizar';
                    const cleanCnpj = config.cnpj.replace(/\D/g, '');
                    const maskedCnpj = cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
                    pdfUrl = `https://${sub}.ginfes.com.br/report/consultarNota?__report=nfs_ver4RT&cnpjPrestador=${maskedCnpj}&numNota=${record.numeroNfse}&cdVerificacao=${codigoVerificacao}&__format=pdf`;
                }
            }
        }

        if (!pdfUrl) {
            return NextResponse.json({ error: 'Média de visualização incompleta: Código de verificação não encontrado no registro nem no XML.' }, { status: 404 });
        }
        
        try {
            const buffer = await fetchNfsePdf(pdfUrl);
            return new NextResponse(buffer as any, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="NFSe-${record.numeroNfse}.pdf"`,
                },
            });
        } catch (fetchError) {
             console.warn('[PDF_PROXY_FALLBACK_REDIRECT]', fetchError);
             // Se falhou o download direto, tenta o redirecionamento como fallback (o navegador lida com o resto)
             return NextResponse.redirect(pdfUrl);
        }
    } catch (error) {
        console.error('[NFSE_PDF_ERROR]', error);
        return NextResponse.json({ error: 'Erro ao processar PDF' }, { status: 500 });
    }
}
