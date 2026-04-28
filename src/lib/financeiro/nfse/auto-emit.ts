/**
 * Emissão automática de NFS-e após confirmação de pagamento.
 * Compartilhado entre: route PUT /api/financeiro/[id] e webhook /api/webhooks/payments/[provider].
 */
import { prisma } from '@/lib/db';
import { getActiveNfseProvider } from './factory';
import { NfseEmitirOptions } from './provider';
import { nextRpsNumero } from './rps-counter';

interface TransactionRef {
    serviceId: string | null;
    clientId: string | null;
    description: string;
    amount: number | null;
    organizationId: string | null;
}

export async function emitirNfseAutomatico(transaction: TransactionRef): Promise<void> {
    if (!transaction.serviceId || !transaction.amount) return;

    // Verifica se já existe NFS-e para este serviço
    const existing = await prisma.nfseRecord.findFirst({
        where: {
            serviceId: transaction.serviceId,
            status: { in: ['pendente', 'aguardando_processamento', 'emitida'] },
        },
    });
    if (existing) return;

    const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
    if (!config?.cnpj) return;

    const nfseProvider = await getActiveNfseProvider();
    if (!nfseProvider) return;

    const client = transaction.clientId
        ? await prisma.client.findUnique({
            where: { id: transaction.clientId },
            select: { name: true, document: true, email: true, address: true, number: true, neighborhood: true, city: true, state: true, zipCode: true },
        })
        : null;

    const rpsNum = await nextRpsNumero();
    const loteId = `auto-${Date.now()}`;
    const discriminacao = transaction.description || 'Serviço prestado';

    const record = await prisma.nfseRecord.create({
        data: {
            rpsNumero: rpsNum,
            rpsSerie: (config as any).serieRps || '1',
            status: 'pendente',
            valorServicos: transaction.amount,
            discriminacao,
            tomadorNome: client?.name ?? null,
            tomadorDoc: client?.document ?? null,
            serviceId: transaction.serviceId,
            clientId: transaction.clientId ?? null,
            ambiente: config.ambiente,
        },
    });

    const now = new Date();
    const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    const dataEmissaoFmt = `${spTime.getFullYear()}-${pad(spTime.getMonth() + 1)}-${pad(spTime.getDate())}T${pad(spTime.getHours())}:${pad(spTime.getMinutes())}:${pad(spTime.getSeconds())}`;
    const dataCompetenciaFmt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01T00:00:00`;

    const emitirOptions: NfseEmitirOptions = {
        rpsNumero: rpsNum,
        rpsSerie: (config as any).serieRps || '1',
        rpsType: (config as any).tipoRps || '1',
        dataEmissao: dataEmissaoFmt,
        dataCompetencia: dataCompetenciaFmt,
        valorServicos: transaction.amount,
        aliquota: config.aliquotaIss || 0.0215,
        issRetido: '2',
        itemListaServico: config.itemListaServico || '1.07',
        codigoMunicipio: config.codigoMunicipio || '3514700',
        discriminacao,
        naturezaOperacao:          (config as any).naturezaOperacao          || '1',
        optanteSimplesNacional:    (config as any).optanteSimplesNacional    || '1',
        regimeEspecialTributacao:  (config as any).regimeEspecialTributacao  || '6',
        incentivadorCultural:      (config as any).incentivadorCultural      || '2',
        exigibilidadeIss:          (config as any).exigibilidadeIss          || '1',
        codigoTributacaoMunicipio: (config as any).codigoTributacaoMunicipio || undefined,
        prestador: {
            cnpj: config.cnpj.replace(/\D/g, ''),
            inscricaoMunicipal: config.inscricaoMunicipal,
        },
        tomador: {
            cpfCnpj: (client?.document ?? '').replace(/\D/g, '') || '00000000000',
            razaoSocial: client?.name ?? 'Consumidor Final',
            endereco: client?.address ?? 'Não informado',
            numero: client?.number ?? 'SN',
            bairro: client?.neighborhood ?? 'Não informado',
            codigoMunicipio: config.codigoMunicipio || '3514700',
            uf: client?.state ?? 'SP',
            cep: (client?.zipCode ?? '').replace(/\D/g, '') || '07000000',
            email: client?.email ?? undefined,
        },
    };

    const result = await nfseProvider.emitir(emitirOptions, loteId);

    await prisma.nfseRecord.update({
        where: { id: record.id },
        data: result.erro
            ? { status: 'erro', errorMessage: result.erro, xmlRetorno: result.xmlRetorno }
            : { status: 'aguardando_processamento', protocolo: result.protocolo ?? null, xmlRetorno: result.xmlRetorno },
    });
}
