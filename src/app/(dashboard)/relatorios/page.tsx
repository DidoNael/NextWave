"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState("12");
  const [dashData, setDashData] = useState<{
    stats: {
      totalReceita: number;
      totalPendente: number;
      totalCancelado: number;
      totalClientes: number;
      totalServicos: number;
      variacaoReceita: number;
      variacaoClientes: number;
    };
    chartData: Array<{ mes: string; receita: number; despesa: number }>;
    topClientes: Array<{ id: string; name: string; totalReceita: number; totalServicos: number }>;
  } | null>(null);

  const [finData, setFinData] = useState<{
    resumo: { totalReceita: number; totalDespesa: number; totalPendente: number; saldo: number };
    transactions: Array<{ category: string; amount: number; type: string }>;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/financeiro?limit=200").then((r) => r.json()),
    ]).then(([dash, fin]) => {
      setDashData(dash);
      setFinData(fin);
    }).catch(() => toast.error("Erro ao carregar relatórios"));
  }, []);

  // Dados por categoria para gráfico de pizza
  const categoriaData = (finData?.transactions || [])
    .filter((t) => t.type === "receita")
    .reduce((acc: Record<string, number>, tx) => {
      acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount;
      return acc;
    }, {});

  const pieData = Object.entries(categoriaData ?? {}).map(([name, value]) => ({ name, value }));

  const chartData = dashData?.chartData?.slice(-parseInt(periodo)) ?? [];

  const handleExport = () => {
    toast.info("Exportação em PDF será implementada na próxima versão.");
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análise detalhada do seu negócio</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Meses</SelectItem>
              <SelectItem value="6">6 Meses</SelectItem>
              <SelectItem value="12">12 Meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Receita Total",
            value: dashData?.stats.totalReceita ?? 0,
            change: dashData?.stats.variacaoReceita ?? 0,
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-100 dark:bg-emerald-900/30",
            isCurrency: true,
          },
          {
            label: "Saldo",
            value: (finData?.resumo.totalReceita ?? 0) - (finData?.resumo.totalDespesa ?? 0),
            icon: DollarSign,
            color: "text-blue-600",
            bg: "bg-blue-100 dark:bg-blue-900/30",
            isCurrency: true,
          },
          {
            label: "Total Clientes",
            value: dashData?.stats.totalClientes ?? 0,
            change: dashData?.stats.variacaoClientes ?? 0,
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-100 dark:bg-purple-900/30",
            isCurrency: false,
          },
          {
            label: "Serviços Ativos",
            value: dashData?.stats.totalServicos ?? 0,
            icon: Briefcase,
            color: "text-amber-600",
            bg: "bg-amber-100 dark:bg-amber-900/30",
            isCurrency: false,
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className={cn("text-2xl font-bold mt-1", kpi.color)}>
                    {kpi.isCurrency ? formatCurrency(kpi.value) : kpi.value.toLocaleString("pt-BR")}
                  </p>
                  {kpi.change !== undefined && (
                    <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium",
                      kpi.change >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {kpi.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {kpi.change >= 0 ? "+" : ""}{kpi.change.toFixed(1)}%
                    </div>
                  )}
                </div>
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", kpi.bg)}>
                  <kpi.icon className={cn("h-6 w-6", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="receitas">
        <TabsList>
          <TabsTrigger value="receitas">Receitas vs Despesas</TabsTrigger>
          <TabsTrigger value="categorias">Por Categoria</TabsTrigger>
          <TabsTrigger value="clientes">Top Clientes</TabsTrigger>
        </TabsList>

        {/* Receitas vs Despesas */}
        <TabsContent value="receitas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receitas x Despesas — Últimos {periodo} meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "receita" ? "Receita" : "Despesa",
                    ]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                  />
                  <Legend formatter={(v) => v === "receita" ? "Receita" : "Despesa"} />
                  <Bar dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Categoria */}
        <TabsContent value="categorias">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhamento por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pieData.slice(0, 6).map((item, i) => {
                    const total = pieData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium truncate">{item.name}</span>
                            <span className="text-muted-foreground shrink-0">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                        <span className="text-sm font-semibold shrink-0">{formatCurrency(item.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Clientes */}
        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clientes por Receita Gerada</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={dashData?.topClientes ?? []}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="totalReceita" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo Financeiro Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Receita Confirmada", value: finData?.resumo.totalReceita ?? 0, color: "text-emerald-600" },
              { label: "Despesas", value: finData?.resumo.totalDespesa ?? 0, color: "text-red-600" },
              { label: "A Receber", value: finData?.resumo.totalPendente ?? 0, color: "text-amber-600" },
              { label: "Saldo Líquido", value: finData?.resumo.saldo ?? 0, color: (finData?.resumo.saldo ?? 0) >= 0 ? "text-emerald-600" : "text-red-600" },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                <p className={cn("text-xl font-bold", item.color)}>{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
