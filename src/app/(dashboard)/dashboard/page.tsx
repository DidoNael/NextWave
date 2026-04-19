import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Users, Receipt, Calendar, Briefcase, TrendingUp, TrendingDown, Clock } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Buscar dados reais do banco
  const [totalClientes, totalTransacoes, totalEventos, totalProjetos] = await Promise.all([
    prisma.client.count().catch(() => 0),
    prisma.transaction.findMany({ take: 5, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.event.findMany({ take: 4, where: { status: "agendado" }, orderBy: { startDate: "asc" } }).catch(() => []),
    prisma.project.count().catch(() => 0),
  ]);

  const receitas = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type: "receita", status: "pago" },
  }).catch(() => ({ _sum: { amount: 0 } }));

  const despesas = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type: "despesa", status: "pago" },
  }).catch(() => ({ _sum: { amount: 0 } }));

  const pendentes = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { status: "pendente" },
  }).catch(() => ({ _sum: { amount: 0 } }));

  const fmt = (v: number | null) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const kpis = [
    { label: "Clientes",    value: String(totalClientes),                  icon: Users,      color: "text-blue-500",   bg: "bg-blue-500/10" },
    { label: "Receitas",    value: fmt(receitas._sum.amount),              icon: TrendingUp, color: "text-green-500",  bg: "bg-green-500/10" },
    { label: "Despesas",    value: fmt(despesas._sum.amount),              icon: TrendingDown,color: "text-red-500",   bg: "bg-red-500/10" },
    { label: "A Receber",   value: fmt(pendentes._sum.amount),             icon: Clock,      color: "text-amber-500",  bg: "bg-amber-500/10" },
    { label: "Projetos",    value: String(totalProjetos),                  icon: Briefcase,  color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Ag. Eventos", value: String(Array.isArray(totalEventos) ? totalEventos.length : 0), icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Olá, {session.user.name} — aqui está o resumo do sistema.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className={`h-9 w-9 rounded-lg ${k.bg} flex items-center justify-center`}>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold text-foreground">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimas transações */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Últimas Transações</h2>
          </div>
          <div className="flex flex-col gap-2">
            {(Array.isArray(totalTransacoes) ? totalTransacoes : []).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-xs font-medium text-foreground truncate max-w-[180px]">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{tx.category}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${tx.type === "receita" ? "text-green-500" : "text-red-500"}`}>
                    {tx.type === "receita" ? "+" : "-"}{fmt(tx.amount)}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    tx.status === "pago" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                  }`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximos eventos */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Próximos Eventos</h2>
          </div>
          <div className="flex flex-col gap-2">
            {(Array.isArray(totalEventos) ? totalEventos : []).map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary leading-none">
                    {new Date(ev.startDate).toLocaleDateString("pt-BR", { day: "2-digit" })}
                  </span>
                  <span className="text-[9px] text-muted-foreground leading-none">
                    {new Date(ev.startDate).toLocaleDateString("pt-BR", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{ev.location || ev.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
