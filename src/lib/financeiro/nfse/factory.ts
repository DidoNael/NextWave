/**
 * getActiveNfseProvider — factory para NfseProvider.
 *
 * Lê NfeConfig.provider do banco e retorna o adapter correto.
 * Padrão idêntico ao getActivePaymentGateway() em src/lib/payments/factory.ts.
 */

import { prisma } from '@/lib/db';
import { decryptCert } from '@/lib/financeiro/ginfes/cert-crypto';
import { GinfesAdapter } from './adapters/ginfes';
import { EnotasAdapter, EnotasConfig } from './adapters/enotas';
import { NfseProvider } from './provider';

export async function getActiveNfseProvider(): Promise<NfseProvider | null> {
    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });

    if (!config || !config.cnpj) return null;

    const provider = (config as any).provider ?? 'ginfes';

    switch (provider) {
        case 'ginfes': {
            if (!config.certificadoBase64) return null;
            return new GinfesAdapter({
                cnpj:               config.cnpj.replace(/\D/g, ''),
                inscricaoMunicipal: config.inscricaoMunicipal,
                // decryptCert aqui corrige bug latente: DELETE handler passava cert criptografado
                certificadoBase64:  decryptCert(config.certificadoBase64),
                senhaCertificado:   config.senhaCertificado
                    ? decryptCert(config.senhaCertificado)
                    : '',
                ambiente: (config.ambiente as 'homologacao' | 'producao') ?? 'homologacao',
            });
        }

        case 'enotas': {
            const raw = (config as any).providerCredentials as string | null;
            if (!raw) return null;

            let creds: EnotasConfig;
            try {
                creds = JSON.parse(raw) as EnotasConfig;
            } catch {
                console.error('[NFSE_FACTORY] providerCredentials JSON inválido para enotas');
                return null;
            }

            // ambiente vem do campo principal — única fonte da verdade
            creds.ambiente = (config.ambiente as 'homologacao' | 'producao') ?? 'homologacao';
            return new EnotasAdapter(creds);
        }

        default:
            console.warn(`[NFSE_FACTORY] Provider desconhecido: ${provider}`);
            return null;
    }
}
