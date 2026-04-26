import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';
import { GinfesSigner } from '@/lib/financeiro/ginfes/signer';
import forge from 'node-forge';

/**
 * GET /api/configuracoes/nfe/cert-check
 *
 * Testa se o certificado PFX armazenado abre corretamente com a senha salva.
 * Retorna info do certificado (CN, validade) sem expor dados sensíveis.
 */
export async function GET() {
    const session = await auth();
    if (!session || !['admin', 'master'].includes(session.user?.role as string)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } }) as any;
    if (!config?.certificadoBase64) {
        return NextResponse.json({ error: 'Nenhum certificado carregado.' }, { status: 400 });
    }

    const pfxBase64 = decryptCert(config.certificadoBase64);
    const senha     = config.senhaCertificado ? decryptCert(config.senhaCertificado) : '';

    // Usa o próprio GinfesSigner para testar — se construir sem erro, o cert abre
    let metodo = 'forge';
    try {
        new GinfesSigner(pfxBase64, senha);
    } catch (err: any) {
        return NextResponse.json({
            ok: false,
            error: err?.message ?? 'Erro desconhecido ao abrir certificado',
        }, { status: 422 });
    }

    // Abre novamente com forge para extrair metadados (CN, validade)
    // Se signer funcionou via openssl, esta parte pode falhar — retornamos info parcial
    let cn = '—', notBefore = '—', notAfter = '—', expired: boolean | null = null;
    try {
        const pfxDer  = forge.util.decode64(pfxBase64);
        const p12Asn1 = forge.asn1.fromDer(pfxDer);
        let p12: forge.pkcs12.Pkcs12Pfx;
        try { p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha); }
        catch { p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha); }
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const cert     = certBags[forge.pki.oids.certBag]?.[0]?.cert;
        cn        = cert?.subject.getField('CN')?.value ?? '—';
        notBefore = cert?.validity.notBefore?.toISOString() ?? '—';
        notAfter  = cert?.validity.notAfter?.toISOString()  ?? '—';
        expired   = cert?.validity.notAfter ? new Date() > cert.validity.notAfter : null;
    } catch {
        metodo = 'openssl'; // forge falhou nos metadados, signer usou openssl
    }

    return NextResponse.json({
        ok: true,
        metodo,
        cn,
        notBefore: notBefore !== '—' ? new Date(notBefore).toLocaleDateString('pt-BR') : '—',
        notAfter:  notAfter  !== '—' ? new Date(notAfter).toLocaleDateString('pt-BR')  : '—',
        expired,
        aviso: metodo === 'openssl'
            ? 'Certificado aberto via openssl (node-forge incompatível com este formato PFX). Emissão funciona normalmente.'
            : undefined,
    });
}
