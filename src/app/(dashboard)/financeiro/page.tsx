"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, TrendingUp, TrendingDown, DollarSign, Clock, Trash2, Edit, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Transaction } from "@/types";
import { formatCurrency, formatDate, getStatusLabel, cn } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const txSchema = z.object({
  description: z.string().min(2, "Descrição obrigatória"),
  amount: z.number({ invalid_type_error: "Valor inválido" }).positive("Valor deve ser positivo"),
  type: z.enum(["receita", "despesa"]),
  category: z.string().min(1, "Categoria obrigatória"),
  status: z.enum(["pendente", "pago", "cancelado"]).default("pendente"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  clientId: z.string().optional(),
});

type TxForm = z.infer<typeof txSchema>;

const CATEGORIAS_RECEITA = ["Desenvolvimento", "Consultoria", "Manutenção", "Design", "Marketing", "Suporte", "Outros"];
const CATEGORIAS_DESPESA = ["Infraestrutura", "Software", "Pessoal", "Marketing", "Equipamentos", "Serviços", "Outros"];

interface Resumo {
  totalReceita: number;
  totalDespesa: number;
  totalPendente: number;
  saldo: number;
}

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, "success" | "warning" | "destructive"> = { pago: "success", pendente: "warning", cancelado: "destructive" };
  return <Badge variant={v[status] ?? "secondary"}>{getStatusLabel(status)}</Badge>;
}

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ totalReceita: 0, totalDespesa: 0, totalPendente: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("todos");

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: { type: "receita", status: "pendente" },
  });

  const txType = watch("type");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, limit: "50" });
      if (typeFilter !== "todos") params.set("type", typeFilter);
      if (statusFilter !== "todos") params.set("status", statusFilter);
      const res = await fetch(`/api/financeiro?${params}`);
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setResumo(data.resumo ?? { totalReceita: 0, totalDespesa: 0, totalPendente: 0, saldo: 0 });
    } catch {
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(t);
  }, [fetchTransactions]);

  const openCreate = (defaultType?: "receita" | "despesa") => {
    setEditingTx(null);
    reset({ type: defaultType ?? "receita", status: "pendente" });
    setIsDialogOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    reset({
      description: tx.description,
      amount: tx.amount,
      type: tx.type as "receita" | "despesa",
      category: tx.category,
      status: tx.status as "pendente" | "pago" | "cancelado",
      dueDate: tx.dueDate ? new Date(tx.dueDate).toISOString().split("T")[0] : "",
      notes: tx.notes ?? "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: TxForm) => {
    try {
      const url = editingTx ? `/api/financeiro/${editingTx.id}` : "/api/financeiro";
      const method = editingTx ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success(editingTx ? "Transação atualizada!" : "Transação criada!");
      setIsDialogOpen(false);
      fetchTransactions();
    } catch {
      toast.error("Erro ao salvar transação");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/financeiro/${deleteId}`, { method: "DELETE" });
      toast.success("Transação removida!");
      setDeleteId(null);
      fetchTransactions();
    } catch {
      toast.error("Erro ao remover transação");
    }
  };

  const filteredByTab = transactions.filter((tx) => {
    if (activeTab === "todos") return true;
    if (activeTab === "receitas") return tx.type === "receita";
    if (activeTab === "despesas") return tx.type === "despesa";
    if (activeTab === "pendentes") return tx.status === "pendente";
    return true;
  });

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Gestão de receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate("despesa")}>
            <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
            Nova Despesa
          </Button>
          <Button onClick={() => openCreate("receita")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Receita
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Receita Total", value: resumo.totalReceita, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
          { label: "Despesas Total", value: resumo.totalDespesa, icon: TrendingDown, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
          { label: "A Receber", value: resumo.totalPendente, icon: Clock, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
          { label: "Saldo", value: resumo.saldo, icon: DollarSign, color: resumo.saldo >= 0 ? "text-blue-600" : "text-red-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className={cn("text-xl font-bold mt-1", kpi.color)}>{formatCurrency(kpi.value)}</p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", kpi.bg)}>
                  <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros e Lista */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Transações</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-9 h-8 w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-36">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 border-b border-border">
              <TabsList className="h-9 bg-transparent p-0 gap-4">
                {[["todos", "Todos"], ["receitas", "Receitas"], ["despesas", "Despesas"], ["pendentes", "Pendentes"]].map(([v, l]) => (
                  <TabsTrigger key={v} value={v} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">
                    {l}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : filteredByTab.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredByTab.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        tx.type === "receita" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" : "bg-red-100 text-red-700 dark:bg-red-900/30"
                      )}>
                        {tx.type === "receita" ? "+" : "-"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.category} {tx.client ? `• ${tx.client.name}` : ""} {tx.dueDate ? `• Vence ${formatDate(tx.dueDate)}` : ""}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        <StatusBadge status={tx.status} />
                        <span className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</span>
                      </div>
                      <p className={cn("text-sm font-semibold shrink-0", tx.type === "receita" ? "text-emerald-600" : "text-red-600")}>
                        {tx.type === "receita" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </p>
                      <div className="flex gap-1 shrink-0">
                        {tx.status === "pendente" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => toast.success(`Cobrança WhatsApp enviada para ${tx.description}`)}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => toast.success(`E-mail de cobrança enviado!`)}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tx)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(tx.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTx ? "Editar Transação" : "Nova Transação"}</DialogTitle>
            <DialogDescription>Preencha os dados da transação financeira.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Desenvolvimento de Website" {...register("description")} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...register("amount", { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(txType === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input type="date" {...register("dueDate")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Notas adicionais..." {...register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : editingTx ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Transação</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
