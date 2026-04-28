"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, TrendingUp, TrendingDown, DollarSign, Clock, Trash2, Edit, MessageSquare, Mail, QrCode, Loader2 } from "lucide-react";
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sendingWpp, setSendingWpp] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);

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

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch("/api/financeiro/assinaturas");
      const data = await res.json();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch {
      console.error("Erro ao carregar assinaturas");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchTransactions();
      fetchSubscriptions();
    }, 300);
    return () => clearTimeout(t);
  }, [fetchTransactions, fetchSubscriptions]);

  const openCreate = (defaultType?: "receita" | "despesa") => {
    toast.info("As transações devem ser geradas através do menu de Serviços.");
    return;
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
          <p className="text-muted-foreground mt-1 text-sm">Central de faturas e consultas automáticas</p>
        </div>
      </div>

      {/* Alerta de Consulta */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
          <DollarSign className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Módulo de Consulta</h4>
          <p className="text-xs text-blue-700 dark:text-blue-300">Todas as receitas são geradas automaticamente através do módulo de <strong>Serviços</strong>. Utilize esta tela para gerenciar faturas, boletos e pagamentos via Pix.</p>
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
                {[["todos", "Todos"], ["receitas", "Receitas"], ["despesas", "Despesas"], ["pendentes", "Pendentes"], ["assinaturas", "Assinaturas"]].map(([v, l]) => (
                  <TabsTrigger key={v} value={v} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">
                    {l}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="todos" className="mt-0">
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
                        {tx.status === "pendente" && tx.type === "receita" && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              title="Link de Pagamento"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/financeiro/${tx.id}/pagar`, { method: "POST" });
                                  const data = await res.json();
                                  if (data.url) window.open(data.url, "_blank");
                                  else throw new Error();
                                } catch {
                                  toast.error("Erro ao gerar link InfinitePay");
                                }
                              }}
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Mostrar QR Code Pix"
                              onClick={async () => {
                                setQrCodeLoading(true);
                                try {
                                  const res = await fetch(`/api/financeiro/${tx.id}/pagar`, { method: "POST" });
                                  const data = await res.json();
                                  if (data.url) {
                                    setQrCodeUrl(data.url);
                                  } else {
                                    throw new Error();
                                  }
                                } catch {
                                  toast.error("Erro ao gerar QR Code");
                                } finally {
                                  setQrCodeLoading(false);
                                }
                              }}
                            >
                              {qrCodeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        )}
                        {tx.status === "pendente" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Enviar cobrança por WhatsApp"
                              disabled={sendingWpp === tx.id}
                              onClick={async () => {
                                setSendingWpp(tx.id);
                                try {
                                  const res = await fetch(`/api/financeiro/${tx.id}/send-whatsapp`, { method: 'POST' });
                                  const data = await res.json();
                                  if (res.ok) toast.success(`Cobrança enviada por WhatsApp!`);
                                  else toast.error(data.error || 'Erro ao enviar WhatsApp');
                                } catch {
                                  toast.error('Erro ao enviar WhatsApp');
                                } finally {
                                  setSendingWpp(null);
                                }
                              }}
                            >
                              {sendingWpp === tx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Enviar cobrança por e-mail"
                              disabled={sendingEmail === tx.id}
                              onClick={async () => {
                                setSendingEmail(tx.id);
                                try {
                                  const res = await fetch(`/api/financeiro/${tx.id}/send-email`, { method: 'POST' });
                                  const data = await res.json();
                                  if (res.ok) toast.success(`Cobrança enviada por e-mail para ${data.sentTo}!`);
                                  else toast.error(data.error || 'Erro ao enviar e-mail');
                                } catch {
                                  toast.error('Erro ao enviar e-mail');
                                } finally {
                                  setSendingEmail(null);
                                }
                              }}
                            >
                              {sendingEmail === tx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
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
            <TabsContent value="assinaturas" className="mt-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Nenhuma assinatura ativa encontrada.</p>
                  <p className="text-[10px] text-muted-foreground uppercase">As assinaturas são geradas automaticamente via módulo de Serviços</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{sub.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.client?.name} • {formatCurrency(sub.amount)} • {sub.interval === "monthly" ? "Mensal" : "Anual"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Próximo Faturamento</p>
                        <p className="text-sm font-semibold">{formatDate(sub.nextBillingDate)}</p>
                      </div>
                      <Badge variant={sub.status === "active" ? "success" : "secondary"}>{sub.status}</Badge>
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

      {/* Dialog Nova Assinatura */}
      <Dialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Assinatura Recorrente</DialogTitle>
            <DialogDescription>Configure um faturamento automático para este cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição do Plano</Label>
              <Input placeholder="Ex: Manutenção Mensal VIP" id="sub-desc" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" id="sub-amount" />
              </div>
              <div className="space-y-2">
                <Label>Intervalo</Label>
                <Select defaultValue="monthly" onValueChange={(val) => { /* handle value change if needed */ }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data do Primeiro Faturamento</Label>
              <Input type="date" id="sub-date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="bg-purple-500/5 border border-purple-500/10 p-3 rounded-lg text-[10px] text-muted-foreground">
              Ao criar, o sistema gerará automaticamente uma transação e enviará o link via WhatsApp na data definida.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={async () => {
              const desc = (document.getElementById("sub-desc") as HTMLInputElement).value;
              const amount = parseFloat((document.getElementById("sub-amount") as HTMLInputElement).value);
              const interval = "monthly"; // Simplificado para o exemplo
              const date = (document.getElementById("sub-date") as HTMLInputElement).value;

              try {
                const res = await fetch("/api/financeiro/assinaturas", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ description: desc, amount, interval, nextBillingDate: date, clientId: "default" }) // clientId fixo para teste ou pegaria de um seletor
                });
                if (res.ok) {
                  toast.success("Assinatura criada!");
                  setIsSubDialogOpen(false);
                  fetchSubscriptions();
                }
              } catch {
                toast.error("Erro ao criar assinatura");
              }
            }}>
              Criar Assinatura
            </Button>
          </DialogFooter>
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
      {/* QR Code Modal */}
      <Dialog open={!!qrCodeUrl} onOpenChange={() => setQrCodeUrl(null)}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>Pagamento via Pix</DialogTitle>
            <DialogDescription>Aponte o celular para realizar o pagamento.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner mt-4">
            {qrCodeUrl && (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                alt="QR Code Pix"
                className="w-48 h-48"
              />
            )}
            <p className="text-[10px] text-muted-foreground mt-4 break-all opacity-50">
              {qrCodeUrl}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={() => window.open(qrCodeUrl || "", "_blank")}>
              Abrir Checkout Completo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
