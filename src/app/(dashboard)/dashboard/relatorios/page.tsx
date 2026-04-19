"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

interface Resumo {
  receita: number;
  despesas: number;
  lucro: number;
  aReceber: number;
}

interface MensalItem {
  month: string;
  receita: number;
  despesas: number;
}

interface CategoriaItem {
  name: string;
  total: number;
}

interface RelatoriosData {
  resumo: Resumo;
  mensal: MensalItem[];
  porCategoria: CategoriaItem[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#6366f1",
];

const PERIOD_OPTIONS: { label: string; value: number }[] = [
  { label: "3 meses", value: 3 },
  { label: "6 meses", value: 6 },
  { label: "12 meses", value: 12 },
];

// ── Skeleton ───────────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

function KpiCard({ title, value, icon, trend, className }: KpiCardProps) {
  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-xl font-bold tracking-tight",
            trend === "up" && "text-emerald-600 dark:text-emerald-400",
            trend === "down" && "text-destructive",
            (!trend || trend === "neutral") && "text-foreground"
          )}
        >
          {formatCurrency(value)}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-md p-3 text-sm">
      {label && (
        <p className="font-semibold text-foreground mb-2">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}:</span>
          <span className="font-medium text-foreground">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card shadow-md p-3 text-sm">
      <p className="font-semibold text-foreground">{item.name}</p>
      <p className="text-muted-foreground mt-1">
        {formatCurrency(item.value)}
      </p>
    </div>
  );
}

// ── Pie Legend ─────────────────────────────────────────────────────────────

function PieLegend({
  data,
}: {
  data: CategoriaItem[];
}) {
  const total = data.reduce((sum, d) => sum + d.total, 0);
  return (
    <div className="space-y-2 mt-4">
      {data.map((item, i) => {
        const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : "0";
        return (
          <div key={item.name} className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="flex-1 text-sm text-foreground truncate">
              {item.name}
            </span>
            <span className="text-xs text-muted-foreground">{pct}%</span>
            <span className="text-sm font-medium text-foreground min-w-[80px] text-right">
              {formatCurrency(item.total)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<RelatoriosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(months);
  }, [months]);

  async function fetchData(m: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/relatorios?months=${m}`);
      if (!res.ok) throw new Error("Erro ao carregar relatórios");
      const json: RelatoriosData = await res.json();
      setData(json);
    } catch {
      toast.error("Não foi possível carregar os relatórios.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <ReportSkeleton />;

  const resumo = data?.resumo ?? {
    receita: 0,
    despesas: 0,
    lucro: 0,
    aReceber: 0,
  };
  const mensal: MensalItem[] = data?.mensal ?? [];
  const porCategoria: CategoriaItem[] = data?.porCategoria ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Relatórios
          </h1>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/40">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMonths(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                months === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita Total"
          value={resumo.receita}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <KpiCard
          title="Despesas"
          value={resumo.despesas}
          icon={<TrendingDown className="h-4 w-4" />}
          trend="down"
        />
        <KpiCard
          title="Lucro"
          value={resumo.lucro}
          icon={<Wallet className="h-4 w-4" />}
          trend={resumo.lucro >= 0 ? "up" : "down"}
        />
        <KpiCard
          title="A Receber"
          value={resumo.aReceber}
          icon={<Clock className="h-4 w-4" />}
          trend="neutral"
        />
      </div>

      <Separator />

      {/* Chart Tabs */}
      <Tabs defaultValue="mensal" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="mensal">Receita Mensal</TabsTrigger>
          <TabsTrigger value="categoria">Por Categoria</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
        </TabsList>

        {/* Tab: Receita Mensal — LineChart */}
        <TabsContent value="mensal">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Receita Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mensal.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={mensal}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("pt-BR", {
                          notation: "compact",
                          style: "currency",
                          currency: "BRL",
                        }).format(v)
                      }
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="receita"
                      name="Receita"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Categoria — PieChart */}
        <TabsContent value="categoria">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Receita por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {porCategoria.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-full md:w-1/2">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={porCategoria}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          innerRadius={55}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {porCategoria.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2">
                    <PieLegend data={porCategoria} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Fluxo — BarChart */}
        <TabsContent value="fluxo">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Fluxo de Caixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mensal.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={mensal}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    barGap={4}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("pt-BR", {
                          notation: "compact",
                          style: "currency",
                          currency: "BRL",
                        }).format(v)
                      }
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs text-muted-foreground">
                          {value}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="receita"
                      name="Receitas"
                      fill="hsl(var(--primary))"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="despesas"
                      name="Despesas"
                      fill="hsl(var(--destructive))"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Empty state for charts ─────────────────────────────────────────────────

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
      Sem dados para o período selecionado.
    </div>
  );
}
