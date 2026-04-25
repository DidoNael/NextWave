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

// Campos adicionados via migração SQL direta — tipagem explícita para evitar cast `any`
interface NfeConfigExtended {
    provider: string;
    providerCredentials: string | null;
}

async function loadConfig(): Promise<(Awaited<ReturnType<typeof prisma.nfeConfig.findUnique>> & NfeConfigExtended) | null> {
    return prisma.nfeConfig.findUnique({ where: { id: 'default' } }) as Promise<any>;
}

export async function getActiveNfseProvider(): Promise<NfseProvider | null> {
    const config = await loadConfig();

    if (!config || !config.cnpj) return null;

    const provider = config.provider ?? 'ginfes';

    switch (provider) {
        case 'ginfes': {
            if (!config.certificadoBase64) return null;
            return new GinfesAdapter({
                cnpj:               config.cnpj.replace(/\D/g, ''),
                inscricaoMunicipal: config.inscricaoMunicipal,
                certificadoBase64:  decryptCert(config.certificadoBase64),
                senhaCertificado:   config.senhaCertificado
                    ? decryptCert(config.senhaCertificado)
                    : '',
                ambiente: (config.ambiente as 'homologacao' | 'producao') ?? 'homologacao',
            });
        }

        case 'enotas': {
            if (!config.providerCredentials) return null;

            let creds: EnotasConfig;
            try {
                creds = JSON.parse(config.providerCredentials) as EnotasConfig;
            } catch {
                console.error('[NFSE_FACTORY] providerCredentials JSON inválido para enotas');
                return null;
            }

            creds.ambiente = (config.ambiente as 'homologacao' | 'producao') ?? 'homologacao';
            return new EnotasAdapter(creds);
        }

        default:
            console.warn(`[NFSE_FACTORY] Provider desconhecido: ${provider}`);
            return null;
    }
}
