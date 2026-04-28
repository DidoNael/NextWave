import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { emitirNfseAutomatico } from "@/lib/financeiro/nfse/auto-emit";

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
      emitirNfseAutomatico(current).catch((err) => {
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

