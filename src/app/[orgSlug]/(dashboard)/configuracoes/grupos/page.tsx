"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Edit, Trash2, Globe, Shield, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// Definição de todos os módulos e ações disponíveis
const PERMISSION_MODULES = [
  {
    key: "clientes", label: "Clientes",
    actions: [
      { key: "ver", label: "Visualizar" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "financeiro", label: "Financeiro",
    actions: [
      { key: "ver", label: "Visualizar" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "servicos", label: "Serviços",
    actions: [
      { key: "ver", label: "Visualizar" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "projetos", label: "Projetos",
    actions: [
      { key: "ver", label: "Visualizar" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "agenda", label: "Agenda",
    actions: [
      { key: "ver", label: "Visualizar" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "whatsapp", label: "WhatsApp",
    actions: [
      { key: "ver", label: "Visualizar" },
      { key: "enviar", label: "Enviar mensagens" },
    ],
  },
  {
    key: "relatorios", label: "Relatórios",
    actions: [
      { key: "ver", label: "Visualizar" },
    ],
  },
  {
    key: "usuarios", label: "Usuários",
    actions: [
      { key: "ver", label: "Visualizar" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "configuracoes", label: "Configurações",
    actions: [
      { key: "ver", label: "Visualizar" },
      { key: "editar", label: "Editar" },
    ],
  },
];

interface Group {
  id: string;
  name: string;
  description: string | null;
  allowedIps: string;
  permissions: string;
  _count: { users: number };
}

type Permissions = Record<string, boolean>;

const DEFAULT_PERMISSIONS: Permissions = Object.fromEntries(
  PERMISSION_MODULES.flatMap(m => m.actions.map(a => [`${m.key}.${a.key}`, false]))
);

function parsePermissions(raw: string): Permissions {
  try {
    return { ...DEFAULT_PERMISSIONS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PERMISSIONS };
  }
}

export default function GruposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Group | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    allowedIps: "*",
    permissions: { ...DEFAULT_PERMISSIONS } as Permissions,
  });

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/grupos");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", allowedIps: "*", permissions: { ...DEFAULT_PERMISSIONS } });
    setModalOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditing(g);
    setForm({
      name: g.name,
      description: g.description || "",
      allowedIps: g.allowedIps || "*",
      permissions: parsePermissions(g.permissions),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/grupos/${editing.id}` : "/api/grupos";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao salvar");
        return;
      }
      toast.success(editing ? "Grupo atualizado!" : "Grupo criado!");
      setModalOpen(false);
      fetchGroups();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este grupo? Os usuários vinculados serão desvinculados.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/grupos/${id}`, { method: "DELETE" });
      toast.success("Grupo removido");
      fetchGroups();
    } finally {
      setDeletingId(null);
    }
  };

  const togglePerm = (key: string) => {
    setForm(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }));
  };

  const toggleModule = (moduleKey: string, actions: { key: string }[]) => {
    const allOn = actions.every(a => form.permissions[`${moduleKey}.${a.key}`]);
    const updates: Permissions = {};
    actions.forEach(a => { updates[`${moduleKey}.${a.key}`] = !allOn; });
    setForm(prev => ({ ...prev, permissions: { ...prev.permissions, ...updates } }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grupos de Usuários</h1>
          <p className="text-muted-foreground mt-1">Defina permissões e restrições por grupo.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Grupo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum grupo cadastrado.</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Criar primeiro grupo</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map(g => {
            const perms = parsePermissions(g.permissions);
            const enabledCount = Object.values(perms).filter(Boolean).length;
            return (
              <div key={g.id} className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-violet-500" />
                    <h3 className="font-bold text-base">{g.name}</h3>
                    <Badge variant="secondary">{g._count.users} usuário{g._count.users !== 1 ? "s" : ""}</Badge>
                  </div>
                  {g.description && <p className="text-sm text-muted-foreground mb-2">{g.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      IP: {g.allowedIps === "*" ? "Livre" : g.allowedIps}
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      {enabledCount} permissão{enabledCount !== 1 ? "ões" : ""} ativa{enabledCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(g)}>
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={deletingId === g.id} onClick={() => handleDelete(g.id)}>
                    {deletingId === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold">{editing ? "Editar Grupo" : "Novo Grupo"}</h2>
                <p className="text-sm text-muted-foreground">Configure permissões e restrições de acesso.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}><X className="h-4 w-4" /></Button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Dados básicos */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Grupo *</Label>
                    <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Atendimento, Financeiro..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição opcional" />
                  </div>
                </div>

                <Separator />

                {/* Restrição de IP */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Globe className="h-4 w-4" /> Restrição de IP
                  </div>
                  <p className="text-xs text-muted-foreground">Use * para liberar todos, ou separe por vírgula. O IP do usuário tem prioridade sobre o do grupo.</p>
                  <Input value={form.allowedIps} onChange={e => setForm({ ...form, allowedIps: e.target.value })} placeholder="* ou 192.168.1.1, 177.91.165.58" />
                </div>

                <Separator />

                {/* Permissões */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Shield className="h-4 w-4" /> Permissões por Módulo
                  </div>
                  <div className="space-y-3">
                    {PERMISSION_MODULES.map(mod => {
                      const allOn = mod.actions.every(a => form.permissions[`${mod.key}.${a.key}`]);
                      const someOn = mod.actions.some(a => form.permissions[`${mod.key}.${a.key}`]);
                      return (
                        <div key={mod.key} className="border border-border/50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">{mod.label}</span>
                            <button type="button" onClick={() => toggleModule(mod.key, mod.actions)}
                              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                allOn ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
                                  : someOn ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}>
                              {allOn ? "Tudo ativo" : someOn ? "Parcial" : "Tudo inativo"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {mod.actions.map(action => {
                              const permKey = `${mod.key}.${action.key}`;
                              const active = form.permissions[permKey];
                              return (
                                <button key={action.key} type="button" onClick={() => togglePerm(permKey)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                                    active
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                                  }`}>
                                  {active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  {action.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editing ? "Salvar Alterações" : "Criar Grupo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
