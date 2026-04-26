import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getActiveNfseProvider } from "@/lib/financeiro/nfse/factory";
import { NfseEmitirOptions } from "@/lib/financeiro/nfse/provider";
import { nextRpsNumero } from "@/lib/financeiro/nfse/rps-counter";

const updateSchema = z.object({
  description: z.string().min(2).optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["receita", "despesa"]).optional(),
  category: z.string().optional(),
  status: z.enum(["pendente", "pago", "cancelado"]).optional(),
  dueDate: z.string().optional(),
  paidAt: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const data = updateSchema.parse(body);

    // Buscar transação atual para detectar mudança de status
    const current = await prisma.transaction.findUnique({
      where: { id: params.id },
      select: { status: true, serviceId: true, clientId: true, description: true, amount: true, organizationId: true },
    });

    const result = await prisma.transaction.updateMany({
      where: { id: params.id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        paidAt: data.paidAt ? new Date(data.paidAt) : data.paidAt === null ? null : undefined,
        clientId: data.clientId === null ? null : data.clientId,
      },
    });

    if (!result.count) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });

    // Auto-emissão de NFS-e quando transação passa para "pago"
    if (
      data.status === 'pago' &&
      current?.status !== 'pago' &&
      current?.serviceId &&
      current?.organizationId
    ) {
      emitirNfseAutomatico(current, session.user as any).catch((err) => {
        console.error('[NFSE_AUTO_EMIT]', err?.message);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
    console.error("[FINANCEIRO_PUT]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    await prisma.transaction.deleteMany({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FINANCEIRO_DELETE]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * Emite NFS-e automaticamente após pagamento confirmado.
 * Fire-and-forget — erros são logados mas não bloqueiam a resposta.
 */
async function emitirNfseAutomatico(
  transaction: { serviceId: string | null; clientId: string | null; description: string; amount: number | null; organizationId: string | null },
  user: { organizationId?: string }
) {
  if (!transaction.serviceId || !transaction.amount) return;

  // Verificar se já existe NFS-e para este serviço
  const existing = await prisma.nfseRecord.findFirst({
    where: {
      serviceId: transaction.serviceId,
      status: { in: ['pendente', 'aguardando_processamento', 'emitida'] },
    },
  });
  if (existing) return; // já tem nota em andamento

  const config = await prisma.nfeConfig.findUnique({ where: { id: 'default' } });
  if (!config?.cnpj) return;

  const nfseProvider = await getActiveNfseProvider();
  if (!nfseProvider) return;

  // Buscar dados do cliente para preencher o tomador
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
    },
  });

  const now = new Date();
  const dataEmissaoFmt = now.toISOString().replace('Z', '').split('.')[0];
  const dataCompetenciaFmt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;

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
