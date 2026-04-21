"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, Briefcase, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Service } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { ClientSearchSelect } from "../clientes/components/ClientSearchSelect";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ServiceKPIs } from "./components/ServiceKPIs";
import { ServiceCard } from "./components/ServiceCard";

const serviceSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional(),
  amount: z.number({ invalid_type_error: "Valor invíílido" }).positive("Valor deve ser positivo"),
  status: z.enum(["rascunho", "enviado", "aprovado", "em_andamento", "concluido", "cancelado"]).default("rascunho"),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  clientId: z.string().optional(),
  notes: z.string().optional(),
  paymentReceived: z.boolean().optional(),
  paymentMethod: z.string().optional(),
  dueDate: z.string().min(1, "Data de vencimento obrigatória"),
  billingFrequency: z.enum(["semanal", "mensal", "trimestral", "avulso"]).default("avulso"),
});

type ServiceForm = z.infer<typeof serviceSchema>;

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "info" | "secondary" | "default" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  enviado: { label: "Enviado", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "success" },
  em_andamento: { label: "Em Andamento", variant: "info" },
  concluido: { label: "Concluído", variant: "success" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

const CATEGORIAS = ["Desenvolvimento", "Consultoria", "Design", "Manutenção", "Marketing", "Suporte", "Infraestrutura", "Outros", "plugin-grafana"];

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/clientes?limit=100")
      .then(res => res.json())
      .then(data => setClientes(data.clientes || []));
  }, []);

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { 
      status: "rascunho",
      title: "",
      amount: 0,
      description: "",
      category: "none",
      clientId: "none",
      paymentReceived: false,
      paymentMethod: "Pix",
      startDate: "",
      endDate: "",
      notes: ""
    },
  });

  const isPaymentReceived = watch("paymentReceived");

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, limit: "50" });
      if (statusFilter !== "todos") params.set("status", statusFilter);
      const res = await fetch(`/api/servicos?${params}`);
      const data = await res.json();
      setServices(data.services ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Erro ao carregar serviíºos");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchServices, 300);
    return () => clearTimeout(t);
  }, [fetchServices]);

  const openCreate = () => {
    reset({ 
      title: "", amount: 0, description: "", status: "rascunho", 
      category: "none", clientId: "none", paymentReceived: false, 
      paymentMethod: "Pix", startDate: "", endDate: "", notes: ""
    });
    setEditingService(null);
    setIsDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    reset({
      title: service.title,
      description: service.description ?? "",
      amount: service.amount,
      status: service.status as ServiceForm["status"],
      category: service.category || "none",
      startDate: service.startDate ? new Date(service.startDate).toISOString().split("T")[0] : "",
      endDate: service.endDate ? new Date(service.endDate).toISOString().split("T")[0] : "",
      clientId: service.clientId || "none",
      notes: service.notes ?? "",
      paymentReceived: (service as any).transactions && (service as any).transactions.length > 0,
      paymentMethod: (service as any).transactions && (service as any).transactions.length > 0 ? (service as any).transactions[0].paymentMethod : "Pix",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ServiceForm) => {
    try {
      const payload = { ...data };
      if (payload.category === "none") payload.category = undefined;
      if (payload.clientId === "none") payload.clientId = undefined;

      const url = editingService ? `/api/servicos/${editingService.id}` : "/api/servicos";
      const method = editingService ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(editingService ? "Serviíºo atualizado!" : "Serviíºo criado!");
      setIsDialogOpen(false);
      fetchServices();
    } catch {
      toast.error("Erro ao salvar serviíºo");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/servicos/${deleteId}`, { method: "DELETE" });
      toast.success("Serviíºo removido!");
      setDeleteId(null);
      fetchServices();
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const totalAtivos = services.filter((s) => ["aprovado", "em_andamento"].includes(s.status)).length;
  const valorTotal = services.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Serviíºos & Oríºamentos</h1>
          <p className="text-muted-foreground mt-1 font-medium">{total} registro{total !== 1 ? "s" : ""} encontrados</p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl h-11 px-6 shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5 mr-2" />
          Novo Serviíºo
        </Button>
      </div>

      <ServiceKPIs 
        total={total} 
        totalAtivos={totalAtivos} 
        valorTotal={valorTotal} 
        formatCurrency={formatCurrency} 
      />

      <Card className="border-none shadow-sm bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar por título, descrição ou categoria..." 
                className="pl-9 h-11 rounded-xl bg-white/80 dark:bg-slate-900/80 border-border/40" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52 h-11 rounded-xl bg-white/80 dark:bg-slate-900/80 border-border/40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Carregando Serviíºos...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white/20 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-border/60">
          <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold text-slate-400">Nenhum serviíºo encontrado</h3>
          <p className="text-sm text-muted-foreground mb-6">Comece criando seu primeiro oríºamento ou serviíºo.</p>
          <Button variant="outline" className="rounded-xl px-8" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Criar Agora
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard 
              key={service.id} 
              service={service} 
              statusConfig={STATUS_CONFIG} 
              formatCurrency={formatCurrency} 
              onEdit={openEdit} 
              onDelete={(id) => setDeleteId(id)} 
            />
          ))}
        </div>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black">{editingService ? "Editar Serviíºo" : "Novo Serviíºo"}</DialogTitle>
              <DialogDescription className="font-medium text-slate-500">Desenvolva oríºamentos profissionais de forma ríípida.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">Título do Serviíºo</Label>
                <Input placeholder="Ex: Desenvolvimento de Site Institucional" className="h-11 rounded-xl" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive font-bold">{errors.title.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">Descrição Detalhada</Label>
                <Textarea placeholder="Descreva os itens inclusos, escopo e detalhes..." className="min-h-[100px] rounded-xl" {...register("description")} />
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">Cliente Solicitante</Label>
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <ClientSearchSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      clients={clientes}
                      placeholder="Pesquisar cliente cadastrado..."
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-300">Valor do Oríºamento</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
                    <Input type="number" step="0.01" className="pl-9 h-11 rounded-xl" {...register("amount", { valueAsNumber: true })} />
                  </div>
                  {errors.amount && <p className="text-xs text-destructive font-bold">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-300">Categoria</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || "none"} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {CATEGORIAS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c === "plugin-grafana" ? "🔌 Plugin Grafana" : c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-300">Periodicidade</Label>
                  <Controller
                    name="billingFrequency"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avulso">Avulso (Ánico)</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                          <SelectItem value="trimestral">Trimestral</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-300">Vencimento</Label>
                  <Input type="date" className="h-11 rounded-xl" {...register("dueDate")} />
                  {errors.dueDate && <p className="text-xs text-destructive font-bold">{errors.dueDate.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">Status Atual</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
                          <SelectItem key={v} value={v}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-2xl border border-dashed border-border p-4 bg-white/50 dark:bg-slate-900/50">
                <div className="space-y-0.5">
                  <Label className="font-bold">Marcar como Pago?</Label>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Gera receita no financeiro automaticamente</p>
                </div>
                <Controller
                  name="paymentReceived"
                  control={control}
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                />
              </div>

              {isPaymentReceived && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label className="font-bold">Meio de Pagamento</Label>
                  <Controller
                    name="paymentMethod"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Pix", "Cartão de Crí®dito", "Cartão de Dí®bito", "Boleto", "Dinheiro"].map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <DialogFooter className="pt-4 gap-2">
                <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => setIsDialogOpen(false)}>Descartar</Button>
                <Button type="submit" className="rounded-xl font-bold px-8 h-11 shadow-lg shadow-primary/20" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingService ? "Atualizar Serviíºo" : "Salvar Serviíºo"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader className="items-center text-center">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black">Remover Serviíºo?</DialogTitle>
            <DialogDescription className="font-medium">Esta ação í® irreversível e removeríí todos os dados vinculados.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="ghost" className="rounded-xl font-bold flex-1" onClick={() => setDeleteId(null)}>Manter</Button>
            <Button variant="destructive" className="rounded-xl font-bold flex-1" onClick={handleDelete}>Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

