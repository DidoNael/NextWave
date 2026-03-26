import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const transactionSchema = z.object({
  description: z.string().min(2, "Descrição obrigatória"),
  amount: z.number().positive("Valor deve ser positivo"),
  type: z.enum(["receita", "despesa"]),
  category: z.string().min(1, "Categoria obrigatória"),
  status: z.enum(["pendente", "pago", "cancelado"]).default("pendente"),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
  clientId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const type = searchParams.get("type") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { description: { contains: search } },
          { category: { contains: search } },
        ],
      }),
      ...(type && { type }),
      ...(status && { status }),
    };

    const [transactions, total, resumo] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { client: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({
        by: ["type", "status"],
        _sum: { amount: true },
      }),
    ]);

    // Calcular totais
    const totalReceita = resumo
      .filter((r) => r.type === "receita" && r.status === "pago")
      .reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);
    const totalDespesa = resumo
      .filter((r) => r.type === "despesa" && r.status === "pago")
      .reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);
    const totalPendente = resumo
      .filter((r) => r.type === "receita" && r.status === "pendente")
      .reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);

    return NextResponse.json({
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      resumo: { totalReceita, totalDespesa, totalPendente, saldo: totalReceita - totalDespesa },
    });
  } catch (error) {
    console.error("[FINANCEIRO_GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await request.json();
    const data = transactionSchema.parse(body);

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId: session.user.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
        clientId: data.clientId || undefined,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[FINANCEIRO_POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
