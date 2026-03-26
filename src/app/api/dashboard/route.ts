import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const userId = session.user.id;

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);

    // Receita total paga do mês atual
    const receitaMesAtual = await prisma.transaction.aggregate({
      where: { userId, type: "receita", status: "pago", paidAt: { gte: inicioMes } },
      _sum: { amount: true },
    });

    // Receita do mês anterior
    const receitaMesAnterior = await prisma.transaction.aggregate({
      where: {
        userId, type: "receita", status: "pago",
        paidAt: { gte: inicioMesAnterior, lte: fimMesAnterior },
      },
      _sum: { amount: true },
    });

    // Pendentes
    const pendente = await prisma.transaction.aggregate({
      where: { userId, type: "receita", status: "pendente" },
      _sum: { amount: true },
    });

    // Cancelados do mês
    const cancelado = await prisma.transaction.aggregate({
      where: { userId, status: "cancelado", createdAt: { gte: inicioMes } },
      _sum: { amount: true },
    });

    // Totais de clientes
    const totalClientes = await prisma.client.count({ where: { userId } });
    const clientesMesAnterior = await prisma.client.count({
      where: { userId, createdAt: { lte: fimMesAnterior } },
    });

    // Total de serviços ativos
    const totalServicos = await prisma.service.count({
      where: { userId, status: { in: ["em_andamento", "aprovado"] } },
    });

    // Gráfico de crescimento (últimos 12 meses)
    const chartData = [];
    for (let i = 11; i >= 0; i--) {
      const dataInicio = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const dataFim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0);

      const [receitaMes, despesaMes] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, type: "receita", paidAt: { gte: dataInicio, lte: dataFim } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, type: "despesa", paidAt: { gte: dataInicio, lte: dataFim } },
          _sum: { amount: true },
        }),
      ]);

      chartData.push({
        mes: dataInicio.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").replace(/^\w/, c => c.toUpperCase()),
        receita: Number(receitaMes._sum.amount ?? 0),
        despesa: Number(despesaMes._sum.amount ?? 0),
      });
    }

    // Top clientes
    const topClientes = await prisma.client.findMany({
      where: { userId },
      include: {
        transactions: { where: { type: "receita", status: "pago" } },
        services: true,
      },
      take: 10,
    });

    const clientesRanked = topClientes
      .map((c) => ({
        id: c.id,
        name: c.name,
        totalReceita: c.transactions.reduce((sum, t) => sum + Number(t.amount), 0),
        totalServicos: c.services.length,
      }))
      .sort((a, b) => b.totalReceita - a.totalReceita)
      .slice(0, 5);

    // Últimas transações
    const ultimasTransacoes = await prisma.transaction.findMany({
      where: { userId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    // Calcular variações percentuais
    const receitaAtualVal = Number(receitaMesAtual._sum.amount ?? 0);
    const receitaAnteriorVal = Number(receitaMesAnterior._sum.amount ?? 0);
    const variacaoReceita = receitaAnteriorVal > 0
      ? ((receitaAtualVal - receitaAnteriorVal) / receitaAnteriorVal) * 100
      : 0;

    const variacaoClientes = clientesMesAnterior > 0
      ? ((totalClientes - clientesMesAnterior) / clientesMesAnterior) * 100
      : 0;

    return NextResponse.json({
      stats: {
        totalReceita: receitaAtualVal,
        totalPendente: Number(pendente._sum.amount ?? 0),
        totalCancelado: Number(cancelado._sum.amount ?? 0),
        totalClientes,
        totalServicos,
        variacaoReceita,
        variacaoClientes,
      },
      chartData,
      topClientes: clientesRanked,
      ultimasTransacoes,
    });
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
