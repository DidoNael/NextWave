"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, Phone, Mail, Building2, Trash2, Edit, Eye, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { formatDate, getInitials, getStatusLabel } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IMaskInput } from "react-imask";

const clienteSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  document: z.string().optional(),
  company: z.string().optional(),
  zipCode: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
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

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteComCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteComCount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { status: "ativo" },
  });

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, limit: "20" });
      if (statusFilter !== "todos") params.set("status", statusFilter);
      const res = await fetch(`/api/clientes?${params}`);
      const data = await res.json();
      setClientes(data.clientes ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchClientes, 300);
    return () => clearTimeout(t);
  }, [fetchClientes]);

  const openCreate = () => {
    setEditingCliente(null);
    reset({
      name: "",
      email: "",
      phone: "",
      document: "",
      company: "",
      zipCode: "",
      address: "",
      city: "",
      state: "",
      notes: "",
      status: "ativo"
    });
    setIsDialogOpen(true);
  };

  const openEdit = (cliente: ClienteComCount) => {
    setEditingCliente(cliente);
    reset({
      name: cliente.name,
      email: cliente.email ?? "",
      phone: cliente.phone ?? "",
      document: cliente.document ?? "",
      company: cliente.company ?? "",
      zipCode: cliente.zipCode ?? "",
      address: cliente.address ?? "",
      city: cliente.city ?? "",
      state: cliente.state ?? "",
      notes: cliente.notes ?? "",
      status: cliente.status as "ativo" | "inativo" | "prospecto",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ClienteForm) => {
    try {
      const url = editingCliente ? `/api/clientes/${editingCliente.id}` : "/api/clientes";
      const method = editingCliente ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success(editingCliente ? "Cliente atualizado!" : "Cliente criado!");
      setIsDialogOpen(false);
      fetchClientes();
    } catch {
      toast.error("Erro ao salvar cliente");
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
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone..."
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
                      <p className="text-sm font-semibold truncate">{cliente.name}</p>
                      <StatusBadge status={cliente.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {cliente.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />{cliente.email}
                        </span>
                      )}
                      {cliente.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{cliente.phone}
                        </span>
                      )}
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
                <Label>Nome *</Label>
                <Input placeholder="Nome completo" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemplo.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask="(00) 00000-0000"
                      definitions={{
                        '#': /[1-9]/,
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="(11) 99999-9999"
                      value={field.value}
                      onAccept={(value: string) => field.onChange(value)}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Controller
                  name="document"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask={[
                        { mask: '000.000.000-00' },
                        { mask: '00.000.000/0000-00' }
                      ]}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="000.000.000-00"
                      value={field.value}
                      onAccept={(value: string) => field.onChange(value)}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Controller
                  name="zipCode"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask="00000-000"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="00000-000"
                      value={field.value}
                      onAccept={(value: string) => field.onChange(value)}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input placeholder="Nome da empresa" {...register("company")} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Endereço</Label>
                <Input placeholder="Rua, número, bairro" {...register("address")} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input placeholder="São Paulo" {...register("city")} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input placeholder="SP" maxLength={2} {...register("state")} />
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
    </div>
  );
}
