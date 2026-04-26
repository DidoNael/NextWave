import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';
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

    const pfxDer  = forge.util.decode64(pfxBase64);
    const p12Asn1 = forge.asn1.fromDer(pfxDer);

    const tentativas = [
        () => forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha),
        () => forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha),
        ...(senha ? [() => forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, '')] : []),
    ];

    let p12: forge.pkcs12.Pkcs12Pfx | null = null;
    let tentativaUsada = 0;
    for (const [i, fn] of tentativas.entries()) {
        try { p12 = fn(); tentativaUsada = i + 1; break; } catch { /* tenta próxima */ }
    }

    if (!p12) {
        return NextResponse.json({
            ok: false,
            error: 'mac verify failure — senha incorreta ou formato PFX moderno (SHA-256/AES-256) incompatível com node-forge.',
            fix: 'Re-exporte o certificado com formato legado: openssl pkcs12 -legacy -in cert.pfx -out temp.pem && openssl pkcs12 -legacy -export -in temp.pem -out cert_legacy.pfx',
        }, { status: 422 });
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;

    const cn        = cert?.subject.getField('CN')?.value ?? '—';
    const notBefore = cert?.validity.notBefore?.toISOString() ?? '—';
    const notAfter  = cert?.validity.notAfter?.toISOString()  ?? '—';
    const expired   = cert?.validity.notAfter ? new Date() > cert.validity.notAfter : null;

    return NextResponse.json({
        ok: true,
        tentativaUsada,
        aviso: tentativaUsada > 1
            ? 'Certificado aberto com modo não-estrito (strict=false). Funcional, mas recomenda-se re-exportar no formato legado para máxima compatibilidade.'
            : undefined,
        cn,
        notBefore,
        notAfter,
        expired,
    });
}
