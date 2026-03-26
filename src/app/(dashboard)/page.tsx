import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DollarSign, Users, Briefcase, TrendingUp, Clock, XCircle, LayoutGrid } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { TopClients } from "@/components/dashboard/TopClients";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Badge } from "@/components/ui/badge";
import { FinanceWidget, WhatsAppWidget, BackupWidget, TasksWidget } from "@/components/dashboard/DashboardWidgets";

async function getDashboardData(userId: string) {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);

  const results = await Promise.all([
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
    prisma.$queryRawUnsafe('SELECT * FROM "SystemModule"') as Promise<any[]>,
    prisma.client.findMany({
      where: { userId },
      include: {
        transactions: { where: { type: "receita", status: "pago" } },
        services: true,
      },
    }),
    prisma.whatsAppMessage.count(),
    prisma.whatsAppChannel.count({ where: { status: "connected" } }),
  ]);

  const receitaMesAtual = results[0] as any;
  const receitaMesAnterior = results[1] as any;
  const pendente = results[2] as any;
  const cancelado = results[3] as any;
  const totalClientes = results[4] as number;
  const clientesMesAnterior = results[5] as number;
  const totalServicos = results[6] as number;
  const ultimasTransacoes = results[7] as any;
  const modulesStatus = results[8] as any[];
  const topClientesRaw = results[9] as any[];
  const totalWhatsAppMessages = results[10] as number;
  const activeWhatsAppInstances = results[11] as number;

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
        receita: Number(r._sum.amount ?? 0),
        despesa: Number(d._sum.amount ?? 0),
      };
    })
  );

  const receitaAtual = Number(receitaMesAtual._sum.amount ?? 0);
  const receitaAnterior = Number(receitaMesAnterior._sum.amount ?? 0);
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
      totalReceita: c.transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0),
      totalServicos: c.services.length,
    }))
    .sort((a: any, b: any) => b.totalReceita - a.totalReceita)
    .slice(0, 5);

  return {
    stats: {
      totalReceita: receitaAtual,
      totalPendente: Number(pendente._sum.amount ?? 0),
      totalCancelado: Number(cancelado._sum.amount ?? 0),
      totalClientes,
      totalServicos,
      variacaoReceita,
      variacaoClientes,
    },
    chartData,
    topClientes,
    ultimasTransacoes,
    activeModules: modulesStatus.filter((m: any) => m.enabled).map((m: any) => m.key),
    whatsAppStats: {
      totalMessages: totalWhatsAppMessages,
      activeInstances: activeWhatsAppInstances,
    }
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { stats, chartData, topClientes, ultimasTransacoes, activeModules, whatsAppStats } = await getDashboardData(session.user.id);

  const saudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight theme-title">Dashboard</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 animate-pulse">
              Modo Modular Ativo
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
            Sincronizado em real-time
          </div>
        </div>
        <p className="text-muted-foreground text-sm">Resumo operacional e métricas de desempenho do sistema.</p>
      </div>
      {/* Grid de Widgets Modulares */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {activeModules.includes("financeiro") && <FinanceWidget stats={stats} />}
        {activeModules.includes("whatsapp") && <WhatsAppWidget data={whatsAppStats} />}
        <BackupWidget data={{ lastBackup: "3h atrás" }} />
        <TasksWidget data={{ pendingTasks: 4 }} />
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
