"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  MoreVertical, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Briefcase,
  User,
  ExternalLink,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Service } from "@/types";
import { formatCurrency, formatDate, getStatusLabel, cn } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const serviceSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional(),
  amount: z.number({ invalid_type_error: "Valor inválido" }).positive("Valor deve ser positivo"),
  status: z.enum(["rascunho", "enviado", "aprovado", "em_andamento", "concluido", "cancelado"]).default("rascunho"),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  clientId: z.string().optional(),
  notes: z.string().optional(),
  paymentReceived: z.boolean().optional(),
  paymentMethod: z.string().optional(),
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

const CATEGORIAS = ["Desenvolvimento", "Consultoria", "Design", "Manutenção", "Marketing", "Suporte", "Infraestrutura", "Outros"];

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clientes, setClientes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/clientes?limit=100")
      .then(res => res.json())
      .then(data => setClientes(data.clientes || []));
  }, []);

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { status: "rascunho" },
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
      toast.error("Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchServices, 300);
    return () => clearTimeout(t);
  }, [fetchServices]);

  const openCreate = () => {
    setEditingService(null);
    reset({ status: "rascunho", paymentReceived: false, paymentMethod: "Pix" });
    setIsDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    reset({
      title: service.title,
      description: service.description ?? "",
      amount: service.amount,
      status: service.status as ServiceForm["status"],
      category: service.category ?? "",
      startDate: service.startDate ? new Date(service.startDate).toISOString().split("T")[0] : "",
      endDate: service.endDate ? new Date(service.endDate).toISOString().split("T")[0] : "",
      clientId: service.clientId ?? "",
      notes: service.notes ?? "",
      paymentReceived: (service as any).transactions && (service as any).transactions.length > 0,
      paymentMethod: (service as any).transactions && (service as any).transactions.length > 0 ? (service as any).transactions[0].paymentMethod : "Pix",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ServiceForm) => {
    try {
      const url = editingService ? `/api/servicos/${editingService.id}` : "/api/servicos";
      const method = editingService ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success(editingService ? "Serviço atualizado!" : "Serviço criado!");
      setIsDialogOpen(false);
      fetchServices();
    } catch {
      toast.error("Erro ao salvar serviço");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/servicos/${deleteId}`, { method: "DELETE" });
      toast.success("Serviço removido!");
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços & Orçamentos</h1>
          <p className="text-muted-foreground mt-1">{total} serviço{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* KPIs rápidos */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Serviços</p>
              <p className="text-xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-xl font-bold">{totalAtivos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-xl font-bold">{formatCurrency(valorTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar serviços..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Serviços */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum serviço encontrado</p>
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro serviço
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const config = STATUS_CONFIG[service.status] ?? { label: service.status, variant: "secondary" as const };
            return (
              <Card key={service.id} className="hover-lift">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(service)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(service.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{service.title}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                    <div className="min-w-0">
                      {service.client && (
                        <div className="flex items-center gap-1 mb-1">
                          <User className="h-3 w-3 text-indigo-500" />
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{service.client.name}</p>
                        </div>
                      )}
                      {service.category && <p className="text-[10px] text-muted-foreground uppercase font-medium">{service.category}</p>}
                    </div>
                    <p className="text-lg font-black text-primary ml-2">{formatCurrency(service.amount)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            <DialogDescription>Preencha os dados do serviço ou orçamento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Ex: Desenvolvimento de Website" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Descrição detalhada do serviço..." {...register("description")} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Vincular a um cliente (Opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input type="number" step="0.01" placeholder="0,00" {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
                        <SelectItem key={v} value={v}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <Controller
              name="paymentReceived"
              control={control}
              render={({ field }) => (
                <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Já recebido?</Label>
                    <p className="text-xs text-muted-foreground text-[10px]">
                      Gera lançamento financeiro de receita automaticamente
                    </p>
                  </div>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />

            {isPaymentReceived && (
              <div className="space-y-2">
                <Label>Meio de Pagamento *</Label>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione o meio de pagamento" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Crédito">Cartão de Crédito</SelectItem>
                        <SelectItem value="Débito">Cartão de Débito</SelectItem>
                        <SelectItem value="Boleto">Boleto Bancário</SelectItem>
                        <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input type="date" {...register("startDate")} />
              </div>
              <div className="space-y-2">
                <Label>Data de Conclusão</Label>
                <Input type="date" {...register("endDate")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Notas adicionais..." {...register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : editingService ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Serviço</DialogTitle>
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
