import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MessageSquare, Send, Users, Zap, CheckCheck, Clock } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardWhatsAppPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [totalMsgs, activeChannels, totalInteractions, sentToday, receivedToday] = await Promise.all([
    prisma.whatsAppMessage.count(),
    prisma.whatsAppChannel.count({ where: { status: "connected" } }),
    prisma.whatsAppInteraction.count({ where: { status: "ativo" } }),
    prisma.whatsAppMessage.count({ where: { fromMe: true, timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.whatsAppMessage.count({ where: { fromMe: false, timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);

  const stats = {
    instanciasAtivas: activeChannels,
    mensagensHoje: sentToday + receivedToday,
    conversasAtivas: totalInteractions,
    taxaResposta: sentToday > 0 ? Math.round((sentToday / (sentToday + receivedToday)) * 100) : 0,
    mensagensEnviadas: sentToday,
    mensagensRecebidas: receivedToday,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight theme-title">Dashboard WhatsApp</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitoramento de instâncias e conversas em tempo real.</p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          {stats.instanciasAtivas} instâncias online
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard title="Mensagens Hoje" value={stats.mensagensHoje} icon={MessageSquare} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" />
        <KPICard title="Conversas Ativas" value={stats.conversasAtivas} icon={Users} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <KPICard title="Taxa de Resposta" value={`${stats.taxaResposta}%`} icon={CheckCheck} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        <KPICard title="Mensagens Enviadas" value={stats.mensagensEnviadas} icon={Send} iconColor="text-cyan-500" iconBg="bg-cyan-500/10" />
        <KPICard title="Mensagens Recebidas" value={stats.mensagensRecebidas} icon={Clock} iconColor="text-amber-500" iconBg="bg-amber-500/10" />
        <KPICard title="Instâncias Ativas" value={stats.instanciasAtivas} icon={Zap} iconColor="text-rose-500" iconBg="bg-rose-500/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Instâncias Conectadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { nome: "Atendimento Principal", numero: "+55 11 9 9999-0001", status: "online", msgs: 98 },
              { nome: "Suporte Técnico", numero: "+55 11 9 9999-0002", status: "online", msgs: 50 },
            ].map((inst) => (
              <div key={inst.nome} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">{inst.nome}</p>
                    <p className="text-xs text-muted-foreground">{inst.numero}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{inst.msgs}</p>
                  <p className="text-xs text-muted-foreground">mensagens</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Distribuição por Horário</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">Gráfico disponível após integração com API WhatsApp</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
