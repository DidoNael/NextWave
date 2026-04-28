import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Briefcase, CheckCircle, Clock, AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getServicesData(userId: string) {
  const [
    total, emAndamento, concluidos, aguardando, cancelados,
    servicosRecentes,
  ] = await Promise.all([
    prisma.service.count({ where: { userId } }),
    prisma.service.count({ where: { userId, status: "em_andamento" } }),
    prisma.service.count({ where: { userId, status: "concluido" } }),
    prisma.service.count({ where: { userId, status: { in: ["pendente", "aprovado"] } } }),
    prisma.service.count({ where: { userId, status: "cancelado" } }),
    prisma.service.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { client: { select: { name: true } } },
    }),
  ]);

  const taxaConclusao = total > 0 ? (concluidos / total) * 100 : 0;

  return { total, emAndamento, concluidos, aguardando, cancelados, taxaConclusao, servicosRecentes };
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pendente:     { label: "Pendente",     color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  aprovado:     { label: "Aprovado",     color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  em_andamento: { label: "Em Andamento", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  concluido:    { label: "Concluído",    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  cancelado:    { label: "Cancelado",    color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default async function DashboardServicosPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getServicesData(session.user.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight theme-title">Dashboard Serviços</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe o andamento e conclusão de serviços.</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          {data.emAndamento} em andamento
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard title="Total de Serviços" value={data.total} icon={Briefcase} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <KPICard title="Em Andamento" value={data.emAndamento} icon={Clock} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        <KPICard title="Concluídos" value={data.concluidos} icon={CheckCircle} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
        <KPICard title="Aguardando" value={data.aguardando} icon={AlertCircle} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <KPICard title="Cancelados" value={data.cancelados} icon={AlertCircle} iconColor="text-red-500" iconBg="bg-red-500/10" />
        <KPICard title="Taxa de Conclusão" value={`${data.taxaConclusao.toFixed(1)}%`} icon={TrendingUp} iconColor="text-cyan-500" iconBg="bg-cyan-500/10" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Serviços Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.servicosRecentes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum serviço cadastrado ainda.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {data.servicosRecentes.map((s) => {
                  const st = statusLabel[s.status] ?? { label: s.status, color: "bg-muted text-muted-foreground border-border" };
                  return (
                    <tr key={s.id}>
                      <td className="font-medium">{s.title}</td>
                      <td className="text-muted-foreground">{s.client?.name ?? "—"}</td>
                      <td>
                        <Badge variant="outline" className={st.color}>{st.label}</Badge>
                      </td>
                      <td className="text-muted-foreground">
                        {new Date(s.updatedAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
