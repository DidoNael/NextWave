import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Badge } from "@/components/ui/badge";

async function getFinancialData(userId: string) {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);
  const inicioAno = new Date(agora.getFullYear(), 0, 1);

  const [
    receitaMes, receitaMesAnterior, despesaMes,
    pendente, atrasado, totalAno,
    ultimasTransacoes,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "receita", status: "pago", paidAt: { gte: inicioMes } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "receita", status: "pago", paidAt: { gte: inicioMesAnterior, lte: fimMesAnterior } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "despesa", status: "pago", paidAt: { gte: inicioMes } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "receita", status: "pendente" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, status: "cancelado", createdAt: { gte: inicioMes } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "receita", status: "pago", paidAt: { gte: inicioAno } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const chartData = await Promise.all(
    Array.from({ length: 12 }, (_, i) => 12 - 1 - i).map(async (i) => {
      const dataInicio = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const dataFim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0);
      const [r, d] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, type: "receita", paidAt: { gte: dataInicio, lte: dataFim } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, type: "despesa", paidAt: { gte: dataInicio, lte: dataFim } },
          _sum: { amount: true },
        }),
      ]);
      return {
        mes: dataInicio.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").replace(/^\w/, c => c.toUpperCase()),
        receita: Number(r._sum.amount ?? 0),
        despesa: Number(d._sum.amount ?? 0),
      };
    })
  );

  const receitaAtual = Number(receitaMes._sum.amount ?? 0);
  const receitaAnterior = Number(receitaMesAnterior._sum.amount ?? 0);
  const variacao = receitaAnterior > 0 ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100 : 0;
  const lucro = receitaAtual - Number(despesaMes._sum.amount ?? 0);

  return {
    receitaMes: receitaAtual,
    despesaMes: Number(despesaMes._sum.amount ?? 0),
    lucroMes: lucro,
    pendente: Number(pendente._sum.amount ?? 0),
    atrasado: Number(atrasado._sum.amount ?? 0),
    totalAno: Number(totalAno._sum.amount ?? 0),
    variacao,
    chartData,
    ultimasTransacoes,
  };
}

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardFinanceiroPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getFinancialData(session.user.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight theme-title">Dashboard Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão consolidada de receitas, despesas e fluxo de caixa.</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </Badge>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard title="Receita do Mês" value={fmt(data.receitaMes)} icon={DollarSign} change={data.variacao} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
        <KPICard title="Despesas do Mês" value={fmt(data.despesaMes)} icon={TrendingDown} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <KPICard title="Lucro Líquido" value={fmt(data.lucroMes)} icon={TrendingUp} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <KPICard title="A Receber" value={fmt(data.pendente)} icon={Clock} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <KPICard title="Cancelados/Perdidos" value={fmt(data.atrasado)} icon={XCircle} iconColor="text-red-400" iconBg="bg-red-400/10" />
        <KPICard title="Receita no Ano" value={fmt(data.totalAno)} icon={BarChart3} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      {/* Gráfico */}
      <GrowthChart data={data.chartData} />

      {/* Transações recentes */}
      <RecentTransactions transactions={data.ultimasTransacoes as unknown as Parameters<typeof RecentTransactions>[0]["transactions"]} />
    </div>
  );
}
