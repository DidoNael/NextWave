"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
  ShieldCheck,
  Clock,
  Wifi,
  WifiOff,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn, getInitials } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = "master" | "admin" | "user";

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  allowedIps: string | null;
  workDayStart: string | null;
  workDayEnd: string | null;
  createdAt: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(["master", "admin", "user"] as const).default("user"),
  allowedIps: z.string().optional(),
  workDayStart: z.string().optional(),
  workDayEnd: z.string().optional(),
});

const createSchema = baseSchema.extend({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const editSchema = baseSchema.extend({
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 6, {
      message: "Senha deve ter no mínimo 6 caracteres",
    }),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;
type UsuarioForm = CreateForm | EditForm;

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    master: "bg-primary/10 text-primary",
    admin: "bg-muted text-foreground",
    user: "text-muted-foreground bg-muted/60",
  };
  const labels: Record<UserRole, string> = {
    master: "Master",
    admin: "Admin",
    user: "Usuário",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        styles[role]
      )}
    >
      <ShieldCheck className="h-3 w-3" />
      {labels[role]}
    </span>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
      <Skeleton className="h-3 w-24 hidden md:block" />
      <Skeleton className="h-7 w-7 rounded-lg" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUsuario, setDeletingUsuario] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<UsuarioForm>({
    resolver: zodResolver(editingUsuario ? editSchema : createSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
      allowedIps: "",
      workDayStart: "",
      workDayEnd: "",
    },
  });

  // Re-apply resolver when editing state changes
  useEffect(() => {
    form.clearErrors();
  }, [editingUsuario, form]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios");
      if (!res.ok) throw new Error("Erro ao buscar usuários");
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : (data.usuarios ?? []));
    } catch {
      toast.error("Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = search
    ? usuarios.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : usuarios;

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditingUsuario(null);
    form.reset({
      name: "",
      email: "",
      password: "",
      role: "user",
      allowedIps: "",
      workDayStart: "",
      workDayEnd: "",
    });
    setDialogOpen(true);
  }

  function openEdit(u: Usuario) {
    setEditingUsuario(u);
    form.reset({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      allowedIps: u.allowedIps ?? "",
      workDayStart: u.workDayStart ?? "",
      workDayEnd: u.workDayEnd ?? "",
    });
    setDialogOpen(true);
  }

  function openDelete(u: Usuario) {
    setDeletingUsuario(u);
    setDeleteDialogOpen(true);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function onSubmit(values: UsuarioForm) {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        role: values.role,
        allowedIps: values.allowedIps || null,
        workDayStart: values.workDayStart || null,
        workDayEnd: values.workDayEnd || null,
      };

      if (!editingUsuario) {
        body.password = (values as CreateForm).password;
      } else if ((values as EditForm).password) {
        body.password = (values as EditForm).password;
      }

      const res = editingUsuario
        ? await fetch(`/api/usuarios/${editingUsuario.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/usuarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Erro ao salvar usuário");
      }

      toast.success(
        editingUsuario
          ? "Usuário atualizado com sucesso."
          : "Usuário criado com sucesso."
      );
      setDialogOpen(false);
      fetchUsuarios();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deletingUsuario) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/usuarios/${deletingUsuario.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir usuário");
      toast.success("Usuário excluído.");
      setDeleteDialogOpen(false);
      fetchUsuarios();
    } catch {
      toast.error("Não foi possível excluir o usuário.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Carregando..."
              : `${filtered.length} usuário${filtered.length !== 1 ? "s" : ""} no sistema`}
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* List header */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1.5fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
          <span className="text-xs font-medium text-muted-foreground">Usuário</span>
          <span className="text-xs font-medium text-muted-foreground">Perfil</span>
          <span className="text-xs font-medium text-muted-foreground">Horário</span>
          <span className="text-xs font-medium text-muted-foreground">IPs</span>
          <span className="text-xs font-medium text-muted-foreground">Ações</span>
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              {search ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
            </p>
            <p className="text-xs text-muted-foreground">
              {search
                ? "Tente ajustar o termo de busca."
                : "Clique em \"Novo Usuário\" para começar."}
            </p>
          </div>
        ) : (
          filtered.map((usuario) => {
            const isCurrentUser = usuario.id === currentUserId;
            return (
              <div
                key={usuario.id}
                className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1.5fr_1fr_auto] gap-3 md:gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                {/* Avatar + Name/Email */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(usuario.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">
                        {usuario.name}
                      </p>
                      {isCurrentUser && (
                        <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-medium shrink-0">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {usuario.email}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center">
                  <RoleBadge role={usuario.role} />
                </div>

                {/* Work hours */}
                <div className="flex items-center">
                  {usuario.workDayStart && usuario.workDayEnd ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0" />
                      {usuario.workDayStart} – {usuario.workDayEnd}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>

                {/* IP Restriction */}
                <div className="flex items-center">
                  {usuario.allowedIps ? (
                    <p className="text-xs text-foreground flex items-center gap-1.5">
                      <Wifi className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate max-w-[100px]">Restrito</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <WifiOff className="h-3 w-3 shrink-0" />
                      Livre
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Ações"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(usuario)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {!isCurrentUser && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDelete(usuario)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUsuario ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="u-name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="u-name"
                placeholder="Nome completo"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="u-email">
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="u-email"
                type="email"
                placeholder="email@exemplo.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="u-password">
                Senha{" "}
                {editingUsuario && (
                  <span className="text-muted-foreground font-normal">
                    (deixe em branco para manter)
                  </span>
                )}
                {!editingUsuario && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="u-password"
                type="password"
                placeholder={editingUsuario ? "Nova senha (opcional)" : "Mínimo 6 caracteres"}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Perfil</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(v) =>
                  form.setValue("role", v as UserRole)
                }
              >
                <SelectTrigger id="u-role">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Work hours */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-workStart">Início do expediente</Label>
                <Input
                  id="u-workStart"
                  type="time"
                  {...form.register("workDayStart")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-workEnd">Fim do expediente</Label>
                <Input
                  id="u-workEnd"
                  type="time"
                  {...form.register("workDayEnd")}
                />
              </div>
            </div>

            {/* Allowed IPs */}
            <div className="space-y-1.5">
              <Label htmlFor="u-ips">IPs permitidos</Label>
              <Textarea
                id="u-ips"
                placeholder={"192.168.1.1\n10.0.0.1"}
                rows={3}
                {...form.register("allowedIps")}
              />
              <p className="text-xs text-muted-foreground">
                Um endereço IP por linha. Deixe vazio para permitir acesso de qualquer IP.
              </p>
            </div>

            <Separator />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Salvando..."
                  : editingUsuario
                  ? "Salvar Alterações"
                  : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-semibold text-foreground">
              {deletingUsuario?.name}
            </span>
            ? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
