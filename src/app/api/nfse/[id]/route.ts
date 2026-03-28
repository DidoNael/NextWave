import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GinfesClient } from '@/lib/financeiro/ginfes/client';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';
import nodemailer from 'nodemailer';

async function enviarEmailNfse(record: any, nfse: { numero: string; codigoVerificacao: string }) {
    if (!record.tomadorDoc && !record.tomadorNome) return; // sem dados do tomador

    // Buscar email do tomador via clientId se houver
    let emailDestino: string | null = null;
    if (record.clientId) {
        const cliente = await prisma.client.findUnique({
            where: { id: record.clientId },
            select: { email: true },
        });
        emailDestino = cliente?.email || null;
    }
    if (!emailDestino) return;

    const smtp = await prisma.smtpConfig.findFirst({ where: { isDefault: true, isActive: true } });
    if (!smtp) return;

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' }, select: { razaoSocial: true, codigoMunicipio: true } });
    const linkNfse = `https://guarulhos.ginfes.com.br/report/consultarNota?chave=${nfse.codigoVerificacao}`;
    const valor = record.valorServicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const transporter = nodemailer.createTransport({
        host: smtp.host, port: smtp.port, secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
    });

    await transporter.sendMail({
        from: `"${smtp.fromName || config?.razaoSocial || 'Empresa'}" <${smtp.fromEmail}>`,
        to: emailDestino,
        subject: `NFS-e nº ${nfse.numero} emitida — ${valor}`,
        html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
                <h2 style="margin:0 0 8px">Nota Fiscal de Serviço Emitida</h2>
                <p style="color:#555">Olá, <strong>${record.tomadorNome || 'Cliente'}</strong>.</p>
                <p style="color:#555">Sua Nota Fiscal de Serviço eletrônica (NFS-e) foi emitida com sucesso.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0">
                    <tr><td style="padding:8px;border:1px solid #eee;color:#888">Número NFS-e</td><td style="padding:8px;border:1px solid #eee;font-weight:bold">${nfse.numero}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #eee;color:#888">Valor</td><td style="padding:8px;border:1px solid #eee;font-weight:bold">${valor}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #eee;color:#888">Serviço</td><td style="padding:8px;border:1px solid #eee">${record.discriminacao}</td></tr>
                </table>
                <a href="${linkNfse}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
                    Visualizar NFS-e
                </a>
                <p style="color:#aaa;font-size:11px;margin-top:24px">Em caso de dúvidas, entre em contato com o prestador de serviços.</p>
            </div>
        `,
    }).catch((err: Error) => {
        console.error('[NFSE_EMAIL_ERROR]', err.message);
    });
}

// GET /api/nfse/[id] — consultar NFS-e (atualiza status via protocolo)
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const record = await prisma.nfseRecord.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    // Se já emitida ou cancelada, retorna direto
    if (['emitida', 'cancelada', 'erro'].includes(record.status)) {
        return NextResponse.json(record);
    }

    // Se aguardando processamento e tem protocolo, consultar situação
    if (record.protocolo) {
        const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
        if (!config?.certificadoBase64) return NextResponse.json(record);

        const client = new GinfesClient({
            cnpj: config.cnpj.replace(/\D/g, ''),
            inscricaoMunicipal: config.inscricaoMunicipal,
            certificadoBase64: decryptCert(config.certificadoBase64),
            senhaCertificado: config.senhaCertificado ? decryptCert(config.senhaCertificado) : '',
            ambiente: (config.ambiente as 'homologacao' | 'producao') || 'homologacao',
        });

        const resultado = await client.consultarSituacaoLote(record.protocolo);

        if (resultado.erro) {
            return NextResponse.json({ ...record, consultaErro: resultado.erro });
        }

        // Situacao 4 = Processado sem erro
        if (resultado.situacao === '4' && resultado.nfseList?.length) {
            const nfse = resultado.nfseList[0];
            const updated = await prisma.nfseRecord.update({
                where: { id: params.id },
                data: {
                    status: 'emitida',
                    numeroNfse: nfse.numero,
                    codigoVerificacao: nfse.codigoVerificacao,
                    emitidaEm: new Date(),
                    xmlRetorno: resultado.xmlRetorno,
                },
            });
            // Enviar email ao tomador (não-bloqueante)
            enviarEmailNfse(updated, nfse);
            return NextResponse.json(updated);
        }

        // Situacao 3 = Processado com erro
        if (resultado.situacao === '3') {
            const updated = await prisma.nfseRecord.update({
                where: { id: params.id },
                data: {
                    status: 'erro',
                    xmlRetorno: resultado.xmlRetorno,
                },
            });
            return NextResponse.json(updated);
        }

        // Ainda processando
        return NextResponse.json({ ...record, situacaoLote: resultado.situacao });
    }

    return NextResponse.json(record);
}

// DELETE /api/nfse/[id] — cancelar NFS-e
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const record = await prisma.nfseRecord.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

    if (record.status !== 'emitida') {
        return NextResponse.json({ error: 'Somente NFS-e emitidas podem ser canceladas' }, { status: 400 });
    }

    if (!record.numeroNfse) {
        return NextResponse.json({ error: 'Número da NFS-e não encontrado' }, { status: 400 });
    }

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
    if (!config?.certificadoBase64) {
        return NextResponse.json({ error: 'Certificado não configurado' }, { status: 400 });
    }

    const client = new GinfesClient({
        cnpj: config.cnpj.replace(/\D/g, ''),
        inscricaoMunicipal: config.inscricaoMunicipal,
        certificadoBase64: config.certificadoBase64,
        senhaCertificado: config.senhaCertificado || '',
        ambiente: (config.ambiente as 'homologacao' | 'producao') || 'homologacao',
    });

    const resultado = await client.cancelarNfse(record.numeroNfse, config.codigoMunicipio || '3514700');

    if (!resultado.sucesso) {
        return NextResponse.json({ error: resultado.erro || 'Erro ao cancelar' }, { status: 422 });
    }

    const updated = await prisma.nfseRecord.update({
        where: { id: params.id },
        data: {
            status: 'cancelada',
            canceladaEm: new Date(),
            xmlRetorno: resultado.xmlRetorno,
        },
    });

    return NextResponse.json(updated);
}
