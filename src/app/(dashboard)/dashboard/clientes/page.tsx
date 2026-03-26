import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Users, UserPlus, UserCheck, TrendingUp, Star, Activity } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { TopClients } from "@/components/dashboard/TopClients";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getClientData(userId: string) {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);

  const [
    totalClientes,
    novosEsseMes,
    novosMesAnterior,
    clientesComServico,
    topClientesRaw,
    ultimosClientes,
  ] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.client.count({ where: { userId, createdAt: { gte: inicioMes } } }),
    prisma.client.count({ where: { userId, createdAt: { gte: inicioMesAnterior, lte: fimMesAnterior } } }),
    prisma.client.count({
      where: { userId, services: { some: { status: { in: ["em_andamento", "aprovado"] } } } },
    }),
    prisma.client.findMany({
      where: { userId },
      include: {
        transactions: { where: { type: "receita", status: "pago" } },
        services: true,
      },
    }),
    prisma.client.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ]);

  const topClientes = topClientesRaw
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      totalReceita: c.transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0),
      totalServicos: c.services.length,
    }))
    .sort((a: any, b: any) => b.totalReceita - a.totalReceita)
    .slice(0, 5);

  const variacaoNovos = novosMesAnterior > 0 ? ((novosEsseMes - novosMesAnterior) / novosMesAnterior) * 100 : 0;
  const taxaAtivos = totalClientes > 0 ? (clientesComServico / totalClientes) * 100 : 0;

  return { totalClientes, novosEsseMes, clientesComServico, variacaoNovos, taxaAtivos, topClientes, ultimosClientes };
}

export default async function DashboardClientesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getClientData(session.user.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight theme-title">Dashboard Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão completa da base de clientes e prospecção.</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          {data.totalClientes} clientes ativos
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard title="Total de Clientes" value={data.totalClientes} icon={Users} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <KPICard title="Novos Este Mês" value={data.novosEsseMes} icon={UserPlus} change={data.variacaoNovos} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
        <KPICard title="Com Serviço Ativo" value={data.clientesComServico} icon={UserCheck} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        <KPICard title="Taxa de Engajamento" value={`${data.taxaAtivos.toFixed(1)}%`} icon={Activity} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <KPICard title="Ticket Médio" value={`${data.totalClientes > 0 ? (data.topClientes.reduce((s: number, c: any) => s + c.totalReceita, 0) / data.totalClientes).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "R$ 0"}`} icon={Star} iconColor="text-rose-500" iconBg="bg-rose-500/10" />
        <KPICard title="Top Clientes" value={data.topClientes.length} icon={TrendingUp} iconColor="text-cyan-500" iconBg="bg-cyan-500/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopClients clients={data.topClientes} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Últimos Cadastros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {data.ultimosClientes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum cliente cadastrado ainda.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ultimosClientes.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name}</td>
                      <td className="text-muted-foreground">{c.email ?? "—"}</td>
                      <td className="text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
