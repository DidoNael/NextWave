import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DollarSign, Users, Briefcase, TrendingUp, Clock, XCircle, LayoutGrid } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { TopClients } from "@/components/dashboard/TopClients";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { FinanceWidget, WhatsAppWidget, BackupWidget, TasksWidget } from "@/components/dashboard/DashboardWidgets";

async function getDashboardData(userId: string) {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);

  const [
    receitaMesAtual,
    receitaMesAnterior,
    pendente,
    cancelado,
    totalClientes,
    clientesMesAnterior,
    totalServicos,
    ultimasTransacoes,
    topClientesRaw,
    modulesStatus,
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
      where: { userId, type: "receita", status: "pendente" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, status: "cancelado", createdAt: { gte: inicioMes } },
      _sum: { amount: true },
    }),
    prisma.client.count({ where: { userId } }),
    prisma.client.count({ where: { userId, createdAt: { lte: fimMesAnterior } } }),
    prisma.service.count({ where: { userId, status: { in: ["em_andamento", "aprovado"] } } }),
    prisma.transaction.findMany({
      where: { userId },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.client.findMany({
      where: { userId },
      include: {
        transactions: { where: { type: "receita", status: "pago" } },
        services: true,
      },
    }),
    prisma.$queryRawUnsafe('SELECT * FROM "SystemModule"') as Promise<any[]>,
  ]);

  // Gráfico dos últimos 12 meses
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
        mes: dataInicio.toLocaleDateString("pt-BR", { month: "short" })
          .replace(".", "")
          .replace(/^\w/, (c) => c.toUpperCase()),
        receita: r._sum.amount ?? 0,
        despesa: d._sum.amount ?? 0,
      };
    })
  );

  const receitaAtual = receitaMesAtual._sum.amount ?? 0;
  const receitaAnterior = receitaMesAnterior._sum.amount ?? 0;
  const variacaoReceita = receitaAnterior > 0
    ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100
    : 0;
  const variacaoClientes = clientesMesAnterior > 0
    ? ((totalClientes - clientesMesAnterior) / clientesMesAnterior) * 100
    : 0;

  const topClientes = topClientesRaw
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      totalReceita: c.transactions.reduce((sum: number, t: any) => sum + t.amount, 0),
      totalServicos: c.services.length,
    }))
    .sort((a: any, b: any) => b.totalReceita - a.totalReceita)
    .slice(0, 5);

  return {
    stats: {
      totalReceita: receitaAtual,
      totalPendente: pendente._sum.amount ?? 0,
      totalCancelado: cancelado._sum.amount ?? 0,
      totalClientes,
      totalServicos,
      variacaoReceita,
      variacaoClientes,
    },
    chartData,
    topClientes,
    ultimasTransacoes,
    activeModules: modulesStatus.filter((m: any) => m.enabled).map((m: any) => m.key),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { stats, chartData, topClientes, ultimasTransacoes, activeModules } = await getDashboardData(session.user.id);

  const saudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header da página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {saudacao()}, {session.user.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está a visão geral modular do seu sistema hoje.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 p-1 bg-muted/50 rounded-lg border border-border/40">
          <LayoutGrid className="h-4 w-4 ml-2 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase mr-2 text-muted-foreground px-2">Dashboard Modular</span>
        </div>
      </div>

      {/* Grid de Widgets Modulares */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {activeModules.includes("financeiro") && <FinanceWidget stats={stats} />}
        {activeModules.includes("whatsapp") && <WhatsAppWidget />}
        <BackupWidget />
        <TasksWidget />
      </div>

      {/* KPI Adicionais (Clientes e Serviços) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Total de Clientes"
          value={stats.totalClientes}
          icon={Users}
          change={stats.variacaoClientes}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />
        <KPICard
          title="Serviços Ativos"
          value={stats.totalServicos}
          icon={Briefcase}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10"
        />
        <KPICard
          title="Atrasos Detectados"
          value={stats.totalCancelado > 0 ? 1 : 0}
          icon={XCircle}
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
        />
      </div>

      {/* Seção de Análise e Atividade */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GrowthChart data={chartData} />
        </div>
        <TopClients clients={topClientes} />
      </div>

      <div className="grid gap-6">
        <RecentTransactions transactions={ultimasTransacoes as Parameters<typeof RecentTransactions>[0]["transactions"]} />
      </div>
    </div>
  );
}
