"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TxType = "receita" | "despesa";
type TxStatus = "pago" | "pendente" | "cancelado";

interface Cliente {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TxType;
  category: string;
  status: TxStatus;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  clientId?: string | null;
  client?: { id: string; name: string } | null;
  createdAt: string;
}

interface Resumo {
  totalReceita: number;
  totalDespesa: number;
  totalPendente: number;
  saldo: number;
}

// â”€â”€â”€ Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const txSchema = z.object({
  description: z.string().min(2, "DescriÃ§Ã£o obrigatÃ³ria"),
  amount: z
    .string()
    .min(1, "Valor obrigatÃ³rio")
    .refine((v) => !isNaN(parseFloat(v.replace(",", "."))) && parseFloat(v.replace(",", ".")) > 0, {
      message: "Valor deve ser positivo",
    }),
  type: z.enum(["receita", "despesa"]),
  category: z.string().min(1, "Categoria obrigatÃ³ria"),
  status: z.enum(["pago", "pendente", "cancelado"]),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
  clientId: z.string().optional(),
});

type TxFormValues = z.infer<typeof txSchema>;

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "MarÃ§o", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function statusBadgeClass(status: TxStatus) {
  switch (status) {
    case "pago":
      return "bg-emerald-500/10 text-emerald-600";
    case "pendente":
      return "bg-amber-500/10 text-amber-600";
    case "cancelado":
      return "bg-destructive/10 text-destructive";
  }
}

// â”€â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconClass: string;
  bgClass: string;
}

function KpiCard({ label, value, icon: Icon, iconClass, bgClass }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", bgClass)}>
        <Icon className={cn("h-5 w-5", iconClass)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function FinanceiroPage() {
  const today = new Date();

  // Month filter state
  const [filterMonth, setFilterMonth] = useState<number | null>(today.getMonth());
  const [filterYear, setFilterYear] = useState<number>(today.getFullYear());
  const [showAll, setShowAll] = useState(false);

  // Search / filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | TxType>("");
  const [statusFilter, setStatusFilter] = useState<"" | TxStatus>("");

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [resumo, setResumo] = useState<Resumo>({
    totalReceita: 0,
    totalDespesa: 0,
    totalPendente: 0,
    saldo: 0,
  });
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<TxFormValues>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      description: "",
      amount: "",
      type: "receita",
      category: "",
      status: "pendente",
      dueDate: "",
      paidAt: "",
      notes: "",
      clientId: "",
    },
  });

  const watchStatus = form.watch("status");

  // â”€â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (!showAll && filterMonth !== null) {
        params.set("mes", String(filterMonth + 1));
        params.set("ano", String(filterYear));
      }

      const res = await fetch(`/api/financeiro?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      if (data.resumo) {
        setResumo({
          totalReceita: data.resumo.totalReceita ?? 0,
          totalDespesa: data.resumo.totalDespesa ?? 0,
          totalPendente: data.resumo.totalPendente ?? 0,
          saldo: data.resumo.saldo ?? 0,
        });
      }
    } catch {
      toast.error("NÃ£o foi possÃ­vel carregar as transaÃ§Ãµes");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, filterMonth, filterYear, showAll]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetch("/api/clientes?limit=200")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.clients ?? d.data ?? [];
        setClientes(list);
      })
      .catch(() => {});
  }, []);

  // â”€â”€â”€ Month navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function prevMonth() {
    setShowAll(false);
    if (filterMonth === 0 || filterMonth === null) {
      setFilterMonth(11);
      setFilterYear((y) => y - 1);
    } else {
      setFilterMonth((m) => (m as number) - 1);
    }
  }

  function nextMonth() {
    setShowAll(false);
    if (filterMonth === 11 || filterMonth === null) {
      setFilterMonth(0);
      setFilterYear((y) => y + 1);
    } else {
      setFilterMonth((m) => (m as number) + 1);
    }
  }

  // â”€â”€â”€ Dialog helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function toInputDate(iso: string | null | undefined) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function openCreate() {
    setEditingTx(null);
    form.reset({
      description: "",
      amount: "",
      type: "receita",
      category: "",
      status: "pendente",
      dueDate: "",
      paidAt: "",
      notes: "",
      clientId: "",
    });
    setDialogOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    form.reset({
      description: tx.description,
      amount: String(tx.amount),
      type: tx.type,
      category: tx.category,
      status: tx.status,
      dueDate: toInputDate(tx.dueDate),
      paidAt: toInputDate(tx.paidAt),
      notes: tx.notes ?? "",
      clientId: tx.clientId ?? "",
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: TxFormValues) {
    try {
      const payload = {
        ...values,
        amount: parseFloat(values.amount.replace(",", ".")),
        dueDate: values.dueDate || undefined,
        paidAt: values.status === "pago" ? values.paidAt || undefined : undefined,
        notes: values.notes || undefined,
        clientId: values.clientId || undefined,
      };

      if (editingTx) {
        const res = await fetch(`/api/financeiro/${editingTx.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("TransaÃ§Ã£o atualizada");
      } else {
        const res = await fetch("/api/financeiro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("TransaÃ§Ã£o criada");
      }
      setDialogOpen(false);
      void fetchTransactions();
    } catch {
      toast.error("Erro ao salvar transaÃ§Ã£o");
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/financeiro/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("TransaÃ§Ã£o excluÃ­da");
      setDeleteId(null);
      void fetchTransactions();
    } catch {
      toast.error("Erro ao excluir transaÃ§Ã£o");
    } finally {
      setDeleting(false);
    }
  }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Controle de receitas e despesas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova TransaÃ§Ã£o
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Receitas"
          value={formatCurrency(resumo.totalReceita)}
          icon={TrendingUp}
          iconClass="text-emerald-600"
          bgClass="bg-emerald-500/10"
        />
        <KpiCard
          label="Despesas"
          value={formatCurrency(resumo.totalDespesa)}
          icon={TrendingDown}
          iconClass="text-destructive"
          bgClass="bg-destructive/10"
        />
        <KpiCard
          label="A Receber"
          value={formatCurrency(resumo.totalPendente)}
          icon={Clock}
          iconClass="text-amber-600"
          bgClass="bg-amber-500/10"
        />
        <KpiCard
          label="Saldo"
          value={formatCurrency(resumo.saldo)}
          icon={Wallet}
          iconClass="text-primary"
          bgClass="bg-primary/10"
        />
      </div>

      {/* Month navigator + All toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            onClick={prevMonth}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="px-3 text-sm font-medium text-foreground min-w-[140px] text-center">
            {showAll
              ? "Todos os perÃ­odos"
              : `${MONTH_NAMES[filterMonth ?? today.getMonth()]} ${filterYear}`}
          </span>
          <button
            onClick={nextMonth}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <Button
          variant={showAll ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAll((v) => !v)}
        >
          Todos
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar transaÃ§Ã£o..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={typeFilter || "todos"}
          onValueChange={(v) => setTypeFilter(v === "todos" ? "" : (v as TxType))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="despesa">Despesa</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter || "todos"}
          onValueChange={(v) => setStatusFilter(v === "todos" ? "" : (v as TxStatus))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma transaÃ§Ã£o encontrada
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-2 bg-muted/40">
              <span className="w-6" />
              <span className="text-xs font-medium text-muted-foreground">DescriÃ§Ã£o</span>
              <span className="text-xs font-medium text-muted-foreground hidden md:block">Categoria</span>
              <span className="text-xs font-medium text-muted-foreground hidden md:block">Vencimento</span>
              <span className="text-xs font-medium text-muted-foreground text-right">Valor</span>
              <span className="text-xs font-medium text-muted-foreground">Status</span>
            </div>

            {transactions.map((tx) => (
              <div key={tx.id} className="flex flex-col">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-muted/40 transition-colors group">
                  {/* Icon */}
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      tx.type === "receita" ? "bg-emerald-500/10" : "bg-destructive/10"
                    )}
                  >
                    {tx.type === "receita" ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>

                  {/* Description */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.description}
                    </p>
                    {tx.client && (
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.client.name}
                      </p>
                    )}
                  </div>

                  {/* Category */}
                  <span className="text-xs text-muted-foreground hidden md:block whitespace-nowrap">
                    {tx.category}
                  </span>

                  {/* Due date */}
                  <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1 whitespace-nowrap">
                    {tx.dueDate ? (
                      <>
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(tx.dueDate)}
                      </>
                    ) : (
                      "â€”"
                    )}
                  </span>

                  {/* Amount */}
                  <span
                    className={cn(
                      "text-sm font-semibold whitespace-nowrap text-right",
                      tx.type === "receita" ? "text-emerald-600" : "text-destructive"
                    )}
                  >
                    {tx.type === "receita" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </span>

                  {/* Status + actions */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        statusBadgeClass(tx.status)
                      )}
                    >
                      {getStatusLabel(tx.status)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(tx)}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(tx.id)}
                        className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline delete confirmation */}
                {deleteId === tx.id && (
                  <div className="mx-4 mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between gap-2">
                    <span className="text-xs text-destructive font-medium">
                      Excluir &ldquo;{tx.description}&rdquo;?
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => setDeleteId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 px-2 text-xs"
                        loading={deleting}
                        onClick={() => handleDelete(tx.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* â”€â”€ Create / Edit Dialog â”€â”€ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTx ? "Editar TransaÃ§Ã£o" : "Nova TransaÃ§Ã£o"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                DescriÃ§Ã£o <span className="text-destructive">*</span>
              </Label>
              <Input
                id="description"
                placeholder="Ex: SessÃ£o fotogrÃ¡fica"
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount">
                  Valor (R$) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  placeholder="0,00"
                  {...form.register("amount")}
                />
                {form.formState.errors.amount && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.amount.message}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="category">
                  Categoria <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="category"
                  placeholder="Ex: Fotografia"
                  {...form.register("category")}
                />
                {form.formState.errors.category && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.category.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Type */}
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(v) => form.setValue("type", v as TxType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v as TxStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Due date */}
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...form.register("dueDate")}
                />
              </div>

              {/* Paid at â€” only when status=pago */}
              {watchStatus === "pago" && (
                <div className="space-y-1.5">
                  <Label htmlFor="paidAt">Data do Pagamento</Label>
                  <Input
                    id="paidAt"
                    type="date"
                    {...form.register("paidAt")}
                  />
                </div>
              )}
            </div>

            {/* Client (optional) */}
            <div className="space-y-1.5">
              <Label>Cliente (opcional)</Label>
              <Select
                value={form.watch("clientId") || "none"}
                onValueChange={(v) =>
                  form.setValue("clientId", v === "none" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">ObservaÃ§Ãµes</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionais..."
                rows={2}
                {...form.register("notes")}
              />
            </div>

            <Separator />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                {editingTx ? "Salvar alteraÃ§Ãµes" : "Criar transaÃ§Ã£o"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

