"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Filter, Phone, Mail, Building2, Trash2, Edit, Eye, MapPin, X, Download, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportClientsDialog } from "../../../(dashboard)/dashboard/clientes/components/ImportClientsDialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Client } from "@/types";
import { formatDate, getInitials, getStatusLabel, cn } from "@/lib/utils";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IMaskInput } from "react-imask";
import { ClientProfile } from "./components/ClientProfile";

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

const clienteSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  emails: z.array(z.object({
    value: z.union([z.literal(""), z.string().email("Email inválido")]),
  })).default([]),
  phones: z.array(z.object({ value: z.string().min(1, "Mínimo 1 telefone") })).min(1, "Adicione pelo menos um telefone"),
  document: z.string()
    .min(1, "CPF/CNPJ obrigatório")
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      if (d.length === 11) return validarCPF(v);
      if (d.length === 14) return validarCNPJ(v);
      return false;
    }, "CPF/CNPJ inválido"),
  company: z.string().min(2, "Nome Fantasia obrigatório"),
  zipCode: z.string().min(8, "CEP obrigatório"),
  address: z.string().min(3, "Logradouro obrigatório"),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  cityCode: z.string().optional(),
  city: z.string().min(2, "Cidade obrigatória"),
  state: z.string().min(2, "UF obrigatória"),
  notes: z.string().optional(),
  status: z.enum(["ativo", "inativo", "prospecto"]).default("ativo"),
});

type ClienteForm = z.infer<typeof clienteSchema>;

type ClienteComCount = Client & { _count?: { transactions: number; services: number } };

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "success" | "warning" | "secondary"> = {
    ativo: "success", prospecto: "warning", inativo: "secondary",
  };
  return <Badge variant={variants[status] ?? "secondary"}>{getStatusLabel(status)}</Badge>;
}

const exportToCSV = (data: ClienteComCount[]) => {
  const headers = [
    "ID", "Nome", "Status", "Empresa", "Documento", "Emails", "Telefones", 
    "CEP", "Endereco", "Numero", "Bairro", "Cidade", "Estado", "Notas", "Criado Em"
  ];
  
  const rows = data.map(c => [
    c.registrationId || "",
    c.name,
    c.status,
    c.company || "",
    c.document || "",
    c.email || "",
    c.phone || "",
    c.zipCode || "",
    c.address || "",
    c.number || "",
    c.neighborhood || "",
    c.city || "",
    c.state || "",
    (c.notes || "").replace(/\n/g, " "),
    c.createdAt ? new Date(c.createdAt).toLocaleDateString("pt-BR") : ""
  ]);

  const csvContent = [
    headers.join(";"),
    ...rows.map(row => row.map(val => `"${val}"`).join(";"))
  ].join("\n");

  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `clientes_nextwave_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteComCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteComCount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { status: "ativo", phones: [{ value: "" }], emails: [{ value: "" }] },
  });

  const [cepLoading, setCepLoading] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "found" | "error">("idle");
  const [cepErrorMsg, setCepErrorMsg] = useState("");
  const cepPrev = useRef("");

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
      if (data.erro) {
        setCepStatus("error");
        setCepErrorMsg("CEP não encontrado");
        return;
      }
      setValue("address", data.logradouro || "", { shouldValidate: true });
      setValue("neighborhood", data.bairro || "");
      setValue("city", data.localidade || "", { shouldValidate: true });
      setValue("state", data.uf || "", { shouldValidate: true });
      setValue("cityCode", data.ibge || "");
      setCepStatus("found");
    } catch {
      setCepStatus("error");
      setCepErrorMsg("Erro ao consultar CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  }, [setValue]);

  const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
    control,
    name: "phones",
  });

  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
    control,
    name: "emails",
  });

  const hasActiveSearch = search.trim().length >= 1 || statusFilter !== "todos";

  const fetchClientes = useCallback(async () => {
    if (!hasActiveSearch) {
      setClientes([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, limit: "20" });
      if (statusFilter !== "todos") params.set("status", statusFilter);
      const res = await fetch(`/api/clientes?${params}`);
      const data = await res.json();
      setClientes(data.clientes ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      console.error("[FETCH_CLIENTES_ERROR]", error);
      toast.error("Erro ao carregar clientes. Verifique o console ou a conexão.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, hasActiveSearch]);

  useEffect(() => {
    const t = setTimeout(fetchClientes, 300);
    return () => clearTimeout(t);
  }, [fetchClientes]);

  const openCreate = () => {
    setEditingCliente(null);
    cepPrev.current = "";
    setCepStatus("idle");
    reset({
      name: "", emails: [{ value: "" }], phones: [{ value: "" }],
      document: "", company: "", zipCode: "", address: "", number: "",
      complement: "", neighborhood: "", cityCode: "", city: "", state: "", notes: "", status: "ativo"
    });
    setIsDialogOpen(true);
  };

  const openEdit = (cliente: ClienteComCount) => {
    setEditingCliente(cliente);
    cepPrev.current = (cliente.zipCode || "").replace(/\D/g, "");
    setCepStatus("idle");
    reset({
      name: cliente.name,
      emails: cliente.email ? cliente.email.split(",").map(e => ({ value: e.trim() })) : [{ value: "" }],
      phones: cliente.phone ? cliente.phone.split(",").map(p => ({ value: p.trim() })) : [{ value: "" }],
      document: cliente.document || "",
      company: cliente.company || "",
      zipCode: cliente.zipCode || "",
      address: cliente.address || "",
      number: cliente.number || "",
      complement: cliente.complement || "",
      neighborhood: cliente.neighborhood || "",
      cityCode: (cliente as any).cityCode || "",
      city: cliente.city || "",
      state: cliente.state || "",
      notes: cliente.notes || "",
      status: (cliente.status as "ativo" | "inativo" | "prospecto") || "ativo",
    });
    setIsDialogOpen(true);
  };

  const openProfile = (id: string) => {
    setSelectedClientId(id);
    setIsProfileOpen(true);
  };

  const onSubmit = async (data: ClienteForm) => {
    try {
      const { emails, phones, ...rest } = data;
      const payload = {
        ...rest,
        email: emails.map(e => e.value).filter(Boolean).join(", "),
        phone: phones.map(p => p.value).filter(Boolean).join(", "),
      };

      const url = editingCliente ? `/api/clientes/${editingCliente.id}` : "/api/clientes";
      const method = editingCliente ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const msg = Array.isArray(err?.error)
          ? err.error.map((e: any) => e.message).join("; ")
          : err?.error ?? "Erro desconhecido";
        throw new Error(msg);
      }

      toast.success(editingCliente ? "Cliente atualizado!" : "Cliente criado!");
      setIsDialogOpen(false);
      fetchClientes();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar cliente");
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ all: "true" });
      if (statusFilter !== "todos") params.set("status", statusFilter);
      if (search) params.set("search", search);
      
      const res = await fetch(`/api/clientes?${params}`);
      const data = await res.json();
      
      if (data.clientes && data.clientes.length > 0) {
        exportToCSV(data.clientes);
        toast.success(`${data.clientes.length} clientes exportados!`);
      } else {
        toast.error("Nenhum cliente para exportar");
      }
    } catch (error) {
      console.error("[EXPORT_ERROR]", error);
      toast.error("Erro ao exportar clientes");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/clientes/${deleteId}`, { method: "DELETE" });
      toast.success("Cliente removido!");
      setDeleteId(null);
      fetchClientes();
    } catch {
      toast.error("Erro ao remover cliente");
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">{total} cliente{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2">
            <Download className={cn("h-4 w-4", exporting && "animate-pulse")} />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone, ID..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="prospecto">Prospectos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !hasActiveSearch ? (
            <div className="py-16 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Busque um cliente para começar</p>
              <p className="text-xs mt-1">Pesquise por nome, email, telefone, ID ou filtre por status</p>
            </div>
          ) : clientes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeiro cliente
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {clientes.map((cliente) => (
                <div key={cliente.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {getInitials(cliente.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {cliente.registrationId && (
                        <span className="text-xs text-muted-foreground font-mono shrink-0">{cliente.registrationId} -</span>
                      )}
                      <p className="text-sm font-semibold truncate">{cliente.name}</p>
                      <StatusBadge status={cliente.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {cliente.email && cliente.email.split(",").map((e, idx) => (
                        <span key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />{e.trim()}
                        </span>
                      ))}
                      {cliente.phone && cliente.phone.split(",").map((p, idx) => (
                        <span key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{p.trim()}
                        </span>
                      ))}
                      {cliente.zipCode && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{cliente.zipCode}
                        </span>
                      )}
                      {cliente.company && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />{cliente.company}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <span>{cliente._count?.transactions ?? 0} transações</span>
                    <span>{cliente._count?.services ?? 0} serviços</span>
                    <span>Desde {formatDate(cliente.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/5" onClick={() => openProfile(cliente.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cliente)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(cliente.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {editingCliente ? "Atualize as informações do cliente." : "Preencha os dados para cadastrar um novo cliente."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome / Razão Social *</Label>
                <Input placeholder="Nome completo ou Razão Social" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Emails</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => appendEmail({ value: "" })}
                  >
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
                {emailFields.map((field, index) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        {...register(`emails.${index}.value` as const)}
                        className="bg-background"
                      />
                      {emailFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive hover:bg-destructive/10"
                          onClick={() => removeEmail(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {errors.emails?.[index]?.value && (
                      <p className="text-[10px] text-destructive italic">{errors.emails[index]?.value?.message}</p>
                    )}
                  </div>
                ))}
                {errors.emails?.message && !errors.emails[0] && (
                  <p className="text-xs text-destructive">{errors.emails.message}</p>
                )}
              </div>
              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Telefones (Mínimo 1) *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => appendPhone({ value: "" })}
                  >
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
                {phoneFields.map((field, index) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex gap-2">
                      <Controller
                        name={`phones.${index}.value`}
                        control={control}
                        render={({ field: fieldProps }) => (
                          <IMaskInput
                            mask={[
                              { mask: "(00) 0000-0000" },
                              { mask: "(00) 00000-0000" }
                            ]}
                            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="(11) 99999-9999"
                            value={fieldProps.value}
                            onAccept={(value: string) => fieldProps.onChange(value)}
                          />
                        )}
                      />
                      {phoneFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive hover:bg-destructive/10"
                          onClick={() => removePhone(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {errors.phones?.[index]?.value && (
                      <p className="text-[10px] text-destructive italic">{errors.phones[index]?.value?.message}</p>
                    )}
                  </div>
                ))}
                {errors.phones?.message && !errors.phones[0] && (
                  <p className="text-xs text-destructive">{errors.phones.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className={errors.document ? "text-destructive" : ""}>CPF/CNPJ *</Label>
                <Controller
                  name="document"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask={[
                        { mask: '000.000.000-00' },
                        { mask: '00.000.000/0000-00' }
                      ]}
                      className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        errors.document && "border-destructive ring-destructive"
                      )}
                      placeholder="000.000.000-00"
                      value={field.value}
                      onAccept={(value: string) => field.onChange(value)}
                    />
                  )}
                />
                {errors.document && <p className="text-[10px] text-destructive italic">{errors.document.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className={errors.zipCode || cepStatus === "error" ? "text-destructive" : ""}>CEP *</Label>
                <div className="relative">
                  <Controller
                    name="zipCode"
                    control={control}
                    render={({ field }) => (
                      <IMaskInput
                        mask="00000-000"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-9",
                          (errors.zipCode || cepStatus === "error") && "border-destructive ring-destructive",
                          cepStatus === "found" && "border-green-500"
                        )}
                        placeholder="00000-000"
                        value={field.value}
                        onAccept={(value: string) => {
                          field.onChange(value);
                          buscarCep(value);
                        }}
                      />
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {cepLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
                    {!cepLoading && cepStatus === "found" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {!cepLoading && cepStatus === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
                {errors.zipCode && <p className="text-[10px] text-destructive italic">{errors.zipCode.message}</p>}
                {!errors.zipCode && cepStatus === "error" && <p className="text-[10px] text-destructive italic">{cepErrorMsg}</p>}
                {!errors.zipCode && cepStatus === "found" && <p className="text-[10px] text-green-600">Endereço preenchido automaticamente</p>}
              </div>
              <div className="space-y-2">
                <Label className={errors.company ? "text-destructive" : ""}>Nome Fantasia *</Label>
                <Input
                  placeholder="Nome Fantasia"
                  {...register("company")}
                  className={cn(errors.company && "border-destructive ring-destructive")}
                />
                {errors.company && <p className="text-[10px] text-destructive italic">{errors.company.message}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label className={errors.address ? "text-destructive" : ""}>Logradouro *</Label>
                <Input
                  placeholder="Rua, Av, Travessa..."
                  {...register("address")}
                  className={cn(errors.address && "border-destructive ring-destructive")}
                />
                {errors.address && <p className="text-[10px] text-destructive italic">{errors.address.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input placeholder="123" {...register("number")} />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input placeholder="Apto, Sala, Bloco..." {...register("complement")} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Bairro</Label>
                <Input placeholder="Bairro" {...register("neighborhood")} />
              </div>
              <div className="space-y-2">
                <Label>Cód. Município (IBGE)</Label>
                <Input placeholder="ex: 3518800" {...register("cityCode")} />
              </div>
              <div className="space-y-2">
                <Label className={errors.city ? "text-destructive" : ""}>Cidade *</Label>
                <Input
                  placeholder="São Paulo"
                  {...register("city")}
                  className={cn(errors.city && "border-destructive ring-destructive")}
                />
                {errors.city && <p className="text-[10px] text-destructive italic">{errors.city.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className={errors.state ? "text-destructive" : ""}>Estado *</Label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask="aa"
                      prepare={(v: string) => v.toUpperCase()}
                      className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 uppercase",
                        errors.state && "border-destructive ring-destructive"
                      )}
                      placeholder="SP"
                      value={field.value}
                      onAccept={(v: string) => field.onChange(v.toUpperCase())}
                    />
                  )}
                />
                {errors.state && <p className="text-[10px] text-destructive italic">{errors.state.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "ativo" | "inativo" | "prospecto")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="prospecto">Prospecto</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Observações</Label>
                <Textarea placeholder="Notas sobre o cliente..." {...register("notes")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : editingCliente ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Delete */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este cliente? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientProfile
        clientId={selectedClientId || ""}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onEdit={(c) => {
          setIsProfileOpen(false);
          openEdit(c);
        }}
      />

      <ImportClientsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={fetchClientes}
      />
    </div>
  );
}
