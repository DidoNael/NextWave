"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, UserRound, Building2,
  MapPin, Phone, Mail, CheckCircle2, AlertCircle, Eye,
} from "lucide-react";
import { ClientProfile } from "@/app/[orgSlug]/(dashboard)/clientes/components/ClientProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { IMaskInput } from "react-imask";
import { cn, getInitials, getStatusLabel } from "@/lib/utils";

// ── Validadores CPF / CNPJ ────────────────────────────────────────────────────

function validarCPF(cpf: string): boolean {
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  const calc = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += parseInt(n[i]) * (len + 1 - i);
    const r = 11 - (s % 11);
    return r >= 10 ? 0 : r;
  };
  return calc(9) === parseInt(n[9]) && calc(10) === parseInt(n[10]);
}

function validarCNPJ(cnpj: string): boolean {
  const n = cnpj.replace(/\D/g, "");
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const calc = (len: number) => {
    let s = 0, p = len - 7;
    for (let i = 0; i < len; i++) { s += parseInt(n[i]) * p--; if (p < 2) p = 9; }
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(n[12]) && calc(13) === parseInt(n[13]);
}

// ── Schema ────────────────────────────────────────────────────────────────────

const clienteSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.union([z.literal(""), z.string().email("E-mail inválido")]).optional(),
  phone: z.string().optional(),
  document: z.string().optional().refine((v) => {
    if (!v) return true;
    const d = v.replace(/\D/g, "");
    if (d.length === 11) return validarCPF(v);
    if (d.length === 14) return validarCNPJ(v);
    return false;
  }, "CPF/CNPJ inválido"),
  company: z.string().optional(),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  cityCode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
  nfseTemplateId: z.string().nullable().optional(),
  emailTemplateId: z.string().nullable().optional(),
});

type ClienteForm = z.infer<typeof clienteSchema>;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Cliente {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  company: string | null;
  zipCode: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  status: "ativo" | "inativo";
  createdAt: string;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isAtivo = status === "ativo";
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      isAtivo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
    )}>
      {getStatusLabel(status)}
    </span>
  );
}

// ── Skeleton Row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-3 w-28 hidden md:block" />
      <Skeleton className="h-3 w-24 hidden lg:block" />
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-7 w-16 rounded-lg" />
    </div>
  );
}

// ── Input class helper ────────────────────────────────────────────────────────

const inputCls = (hasError?: boolean) => cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
  hasError && "border-destructive ring-destructive"
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [emailTemplates, setEmailTemplates] = useState<{ id: string; name: string }[]>([]);
  const [nfseTipos, setNfseTipos] = useState<{ id: string; nome: string }[]>([]);

  // CEP state
  const [cepLoading, setCepLoading] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "found" | "error">("idle");
  const [cepErrorMsg, setCepErrorMsg] = useState("");
  const cepPrev = useRef("");

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { name: "", email: "", phone: "", document: "", company: "", zipCode: "", address: "", number: "", complement: "", neighborhood: "", cityCode: "", city: "", state: "", notes: "", status: "ativo" },
  });

  // ── CEP lookup ──────────────────────────────────────────────────────────────

  const buscarCep = useCallback(async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) { setCepStatus("idle"); return; }
    if (clean === cepPrev.current) return;
    cepPrev.current = clean;
    setCepLoading(true);
    setCepStatus("idle");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) { setCepStatus("error"); setCepErrorMsg("CEP não encontrado"); return; }
      setValue("address", data.logradouro || "", { shouldValidate: true });
      setValue("neighborhood", data.bairro || "");
      setValue("cityCode", data.ibge || "");
      setValue("city", data.localidade || "", { shouldValidate: true });
      setValue("state", data.uf || "", { shouldValidate: true });
      setCepStatus("found");
    } catch {
      setCepStatus("error");
      setCepErrorMsg("Erro ao consultar CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  }, [setValue]);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (statusFilter !== "todos") params.set("status", statusFilter);
      const res = await fetch(`/api/clientes?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao buscar clientes");
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : (data.clientes ?? []));
    } catch {
      toast.error("Não foi possível carregar os clientes.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchClientes, 300);
    return () => clearTimeout(timer);
  }, [fetchClientes]);

  useEffect(() => {
    fetch("/api/modelos/email").then(r => r.ok ? r.json() : []).then(setEmailTemplates).catch(() => {});
    fetch("/api/nfse/tipos").then(r => r.ok ? r.json() : []).then(setNfseTipos).catch(() => {});
  }, []);

  // ── Dialog helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditingCliente(null);
    cepPrev.current = "";
    setCepStatus("idle");
    reset({ name: "", email: "", phone: "", document: "", company: "", zipCode: "", address: "", number: "", complement: "", neighborhood: "", cityCode: "", city: "", state: "", notes: "", status: "ativo", nfseTemplateId: null, emailTemplateId: null });
    setDialogOpen(true);
  }

  function openEdit(c: Cliente) {
    setEditingCliente(c);
    cepPrev.current = (c.zipCode || "").replace(/\D/g, "");
    setCepStatus("idle");
    reset({
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      document: c.document ?? "",
      company: c.company ?? "",
      zipCode: c.zipCode ?? "",
      address: c.address ?? "",
      number: c.number ?? "",
      complement: c.complement ?? "",
      neighborhood: c.neighborhood ?? "",
      cityCode: (c as any).cityCode ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      notes: c.notes ?? "",
      status: c.status,
      nfseTemplateId: (c as any).nfseTemplateId ?? null,
      emailTemplateId: (c as any).emailTemplateId ?? null,
    });
    setDialogOpen(true);
  }

  function openDelete(c: Cliente) {
    setDeletingCliente(c);
    setDeleteDialogOpen(true);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function onSubmit(values: ClienteForm) {
    setSubmitting(true);
    try {
      // Envia string vazia como undefined para campos opcionais
      const body = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === "" ? undefined : v])
      );

      const url = editingCliente ? `/api/clientes/${editingCliente.id}` : "/api/clientes";
      const method = editingCliente ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const msg = Array.isArray(err?.error)
          ? err.error.map((e: any) => e.message).join("; ")
          : err?.error ?? err?.message ?? "Erro ao salvar cliente";
        throw new Error(msg);
      }

      toast.success(editingCliente ? "Cliente atualizado com sucesso." : "Cliente criado com sucesso.");
      setDialogOpen(false);
      fetchClientes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deletingCliente) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clientes/${deletingCliente.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir cliente");
      toast.success("Cliente excluído.");
      setDeleteDialogOpen(false);
      fetchClientes();
    } catch {
      toast.error("Não foi possível excluir o cliente.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${clientes.length} cliente${clientes.length !== 1 ? "s" : ""} encontrado${clientes.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar por nome, e-mail, empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
          <span className="text-xs font-medium text-muted-foreground">Cliente</span>
          <span className="text-xs font-medium text-muted-foreground">Contato</span>
          <span className="text-xs font-medium text-muted-foreground">Empresa</span>
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <span className="text-xs font-medium text-muted-foreground">Ações</span>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <UserRound className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhum cliente encontrado</p>
            <p className="text-xs text-muted-foreground">
              {search || statusFilter !== "todos" ? "Tente ajustar os filtros de busca." : "Clique em \"Novo Cliente\" para começar."}
            </p>
          </div>
        ) : (
          clientes.map((cliente) => (
            <div key={cliente.id} className="flex flex-col md:grid md:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 md:gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs">{getInitials(cliente.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{cliente.name}</p>
                  {cliente.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {[cliente.city, cliente.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-center gap-0.5 min-w-0">
                {cliente.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{cliente.email}</p>}
                {cliente.phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 shrink-0" />{cliente.phone}</p>}
                {!cliente.email && !cliente.phone && <p className="text-xs text-muted-foreground">—</p>}
              </div>
              <div className="flex items-center min-w-0">
                {cliente.company
                  ? <p className="text-xs text-foreground flex items-center gap-1.5 truncate"><Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />{cliente.company}</p>
                  : <p className="text-xs text-muted-foreground">—</p>}
              </div>
              <div className="flex items-center"><StatusBadge status={cliente.status} /></div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" onClick={() => { setSelectedClientId(cliente.id); setProfileOpen(true); }} title="Ver perfil"><Eye className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cliente)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDelete(cliente)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">

              {/* Nome */}
              <div className="col-span-2 space-y-1.5">
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input placeholder="Nome completo ou Razão Social" {...register("name")} className={cn(errors.name && "border-destructive")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" placeholder="email@exemplo.com" {...register("email")} className={cn(errors.email && "border-destructive")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask={[{ mask: "(00) 0000-0000" }, { mask: "(00) 00000-0000" }]}
                      className={inputCls()}
                      placeholder="(11) 99999-9999"
                      value={field.value ?? ""}
                      onAccept={(v: string) => field.onChange(v)}
                    />
                  )}
                />
              </div>

              {/* CPF/CNPJ */}
              <div className="space-y-1.5">
                <Label>CPF / CNPJ</Label>
                <Controller
                  name="document"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask={[{ mask: "000.000.000-00" }, { mask: "00.000.000/0000-00" }]}
                      className={inputCls(!!errors.document)}
                      placeholder="000.000.000-00"
                      value={field.value ?? ""}
                      onAccept={(v: string) => field.onChange(v)}
                    />
                  )}
                />
                {errors.document && <p className="text-xs text-destructive">{errors.document.message}</p>}
              </div>

              {/* Empresa */}
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Input placeholder="Nome da empresa" {...register("company")} />
              </div>

              {/* CEP */}
              <div className="space-y-1.5">
                <Label className={cepStatus === "error" ? "text-destructive" : ""}>CEP</Label>
                <div className="relative">
                  <Controller
                    name="zipCode"
                    control={control}
                    render={({ field }) => (
                      <IMaskInput
                        mask="00000-000"
                        className={cn(inputCls(), "pr-9",
                          cepStatus === "error" && "border-destructive",
                          cepStatus === "found" && "border-green-500"
                        )}
                        placeholder="00000-000"
                        value={field.value ?? ""}
                        onAccept={(v: string) => { field.onChange(v); buscarCep(v); }}
                      />
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {cepLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
                    {!cepLoading && cepStatus === "found" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {!cepLoading && cepStatus === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
                {cepStatus === "error" && <p className="text-xs text-destructive">{cepErrorMsg}</p>}
                {cepStatus === "found" && <p className="text-xs text-green-600">Endereço preenchido automaticamente</p>}
              </div>

              {/* Logradouro */}
              <div className="col-span-2 space-y-1.5">
                <Label>Logradouro</Label>
                <Input placeholder="Rua, Av, Travessa..." {...register("address")} />
              </div>

              {/* Número + Complemento */}
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input placeholder="123 / S/N" {...register("number")} />
              </div>
              <div className="space-y-1.5">
                <Label>Complemento</Label>
                <Input placeholder="Apto, Sala, Bloco..." {...register("complement")} />
              </div>

              {/* Bairro */}
              <div className="col-span-2 space-y-1.5">
                <Label>Bairro</Label>
                <Input placeholder="Bairro" {...register("neighborhood")} />
              </div>
              <div className="space-y-1.5">
                <Label>Cód. Município (IBGE)</Label>
                <Input placeholder="ex: 3518800" {...register("cityCode")} />
              </div>

              {/* Cidade + Estado */}
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input placeholder="São Paulo" {...register("city")} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask="aa"
                      prepare={(v: string) => v.toUpperCase()}
                      className={cn(inputCls(), "uppercase")}
                      placeholder="SP"
                      value={field.value ?? ""}
                      onAccept={(v: string) => field.onChange(v.toUpperCase())}
                    />
                  )}
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "ativo" | "inativo")}>
                  <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div className="col-span-2 space-y-1.5">
                <Label>Observações</Label>
                <Textarea placeholder="Informações adicionais..." rows={3} {...register("notes")} />
              </div>

              {/* Modelo de E-mail NFS-e */}
              {emailTemplates.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Modelo de E-mail (NFS-e)</Label>
                  <Controller
                    name="emailTemplateId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "default"}
                        onValueChange={v => field.onChange(v === "default" ? null : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Padrão do sistema" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Padrão do sistema</SelectItem>
                          {emailTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              {/* Modelo Fiscal NFS-e */}
              {nfseTipos.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Modelo Fiscal (NFS-e)</Label>
                  <Controller
                    name="nfseTemplateId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "default"}
                        onValueChange={v => field.onChange(v === "default" ? null : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Padrão do sistema" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Padrão do sistema</SelectItem>
                          {nfseTipos.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
            </div>

            <Separator />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : editingCliente ? "Salvar Alterações" : "Criar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-semibold text-foreground">{deletingCliente?.name}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Profile (Serviços, Financeiro, NFS-e, Anexos) */}
      {selectedClientId && (
        <ClientProfile
          clientId={selectedClientId}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          onEdit={(c) => {
            setProfileOpen(false);
            openEdit(c);
          }}
        />
      )}
    </div>
  );
}
