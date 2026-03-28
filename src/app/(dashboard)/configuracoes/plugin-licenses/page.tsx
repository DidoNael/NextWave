"use client";

import { useState, useEffect } from "react";
import {
  Key, Copy, Check, Loader2, Plus, Ban, ShieldOff, Trash2, AlertTriangle, FlaskConical
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface PluginLicense {
  id: string;
  key: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  issuedAt: string;
  expiresAt: string | null;
  lastValidAt: string | null;
  lastIp: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ license }: { license: PluginLicense }) {
  if (license.status === "blocked") {
    return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20">Bloqueado</Badge>;
  }
  if (license.status === "suspended") {
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20">Suspenso</Badge>;
  }
  if (license.isTrial) {
    if (license.trialEndsAt && new Date() > new Date(license.trialEndsAt)) {
      return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/20">Trial Expirado</Badge>;
    }
    return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/20 gap-1"><FlaskConical className="h-3 w-3" />Trial</Badge>;
  }
  return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">Ativo</Badge>;
}

function CopyKeyButton({ licenseKey }: { licenseKey: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const truncated = licenseKey.slice(0, 12) + "..." + licenseKey.slice(-6);
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">{truncated}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function trialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function PluginLicensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMaster = (session?.user as any)?.role === "master";

  useEffect(() => {
    if (status === "authenticated" && !isMaster) router.replace("/");
  }, [status, isMaster, router]);

  const [licenses, setLicenses] = useState<PluginLicense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    customerName: "", customerEmail: "", expiresAt: "", notes: "",
    isTrial: false, trialDays: "3",
  });
  const [isSaving, setIsSaving] = useState(false);

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [licenseToBlock, setLicenseToBlock] = useState<PluginLicense | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [licenseToDelete, setLicenseToDelete] = useState<PluginLicense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { if (isMaster) fetchLicenses(); }, [isMaster]);

  const fetchLicenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/plugin-licenses");
      if (!res.ok) throw new Error();
      setLicenses(await res.json());
    } catch {
      toast.error("Erro ao carregar licenças de plugin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newForm.customerName.trim()) { toast.error("O nome do cliente é obrigatório."); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/plugin-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newForm.customerName.trim(),
          customerEmail: newForm.customerEmail.trim() || null,
          expiresAt: newForm.expiresAt || null,
          notes: newForm.notes.trim() || null,
          isTrial: newForm.isTrial,
          trialDays: Number(newForm.trialDays) || 3,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(newForm.isTrial ? `Licença trial de ${newForm.trialDays} dia(s) criada!` : "Licença criada com sucesso!");
      setNewDialogOpen(false);
      setNewForm({ customerName: "", customerEmail: "", expiresAt: "", notes: "", isTrial: false, trialDays: "3" });
      await fetchLicenses();
    } catch {
      toast.error("Erro ao criar licença.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspend = async (license: PluginLicense) => {
    const newStatus = license.status === "suspended" ? "active" : "suspended";
    try {
      const res = await fetch(`/api/plugin-licenses/${license.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...license, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(newStatus === "suspended" ? "Licença suspensa." : "Licença reativada.");
      await fetchLicenses();
    } catch {
      toast.error("Erro ao alterar status.");
    }
  };

  const handleBlock = async () => {
    if (!licenseToBlock) return;
    setIsBlocking(true);
    try {
      const res = await fetch(`/api/plugin-licenses/${licenseToBlock.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...licenseToBlock, status: "blocked" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Licença bloqueada permanentemente.");
      setBlockDialogOpen(false);
      setLicenseToBlock(null);
      await fetchLicenses();
    } catch {
      toast.error("Erro ao bloquear licença.");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleDelete = async () => {
    if (!licenseToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/plugin-licenses/${licenseToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Licença removida.");
      setDeleteDialogOpen(false);
      setLicenseToDelete(null);
      await fetchLicenses();
    } catch {
      toast.error("Erro ao remover licença.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            Licenças de Plugin
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as chaves de licença para os plugins externos (ex: Grafana Topology).
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Licença
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Licenças Emitidas</CardTitle>
          <CardDescription>
            {licenses.length === 0 ? "Nenhuma licença emitida ainda." : `${licenses.length} licença(s) registrada(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {licenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Key className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhuma licença encontrada. Clique em "Nova Licença" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Chave</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trial / Expiração</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Última Validação</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license) => (
                    <tr key={license.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{license.customerName}</div>
                        {license.customerEmail && (
                          <div className="text-xs text-muted-foreground">{license.customerEmail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <CopyKeyButton licenseKey={license.key} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge license={license} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {license.isTrial && license.trialEndsAt ? (
                          <div>
                            <div className="flex items-center gap-1 text-blue-500 font-medium">
                              <FlaskConical className="h-3 w-3" />
                              {trialDaysLeft(license.trialEndsAt) > 0
                                ? `${trialDaysLeft(license.trialEndsAt)} dia(s) restantes`
                                : "Trial encerrado"}
                            </div>
                            <div className="text-[10px] opacity-60 mt-0.5">Até {formatDate(license.trialEndsAt)}</div>
                          </div>
                        ) : license.expiresAt ? (
                          <span className={new Date() > new Date(license.expiresAt) ? "text-red-500 font-medium" : ""}>
                            {formatDate(license.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-green-600">Sem expiração</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(license.lastValidAt)}
                        {license.lastIp && <div className="text-[10px] opacity-60">{license.lastIp}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {license.status !== "blocked" && (
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs"
                              onClick={() => handleSuspend(license)}
                              title={license.status === "suspended" ? "Reativar" : "Suspender"}>
                              <ShieldOff className="h-3.5 w-3.5" />
                              {license.status === "suspended" ? "Reativar" : "Suspender"}
                            </Button>
                          )}
                          {license.status !== "blocked" && (
                            <Button variant="ghost" size="sm"
                              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => { setLicenseToBlock(license); setBlockDialogOpen(true); }}>
                              <Ban className="h-3.5 w-3.5" />
                              Bloquear
                            </Button>
                          )}
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setLicenseToDelete(license); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Nova Licença */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Nova Licença de Plugin
            </DialogTitle>
            <DialogDescription>
              Uma chave única será gerada automaticamente para este cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Cliente <span className="text-destructive">*</span></Label>
              <Input placeholder="Ex: Empresa ABC Ltda"
                value={newForm.customerName}
                onChange={(e) => setNewForm({ ...newForm, customerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email do Cliente</Label>
              <Input type="email" placeholder="cliente@empresa.com"
                value={newForm.customerEmail}
                onChange={(e) => setNewForm({ ...newForm, customerEmail: e.target.value })} />
            </div>

            {/* Toggle Trial */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <input
                type="checkbox"
                id="isTrial"
                checked={newForm.isTrial}
                onChange={(e) => setNewForm({ ...newForm, isTrial: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-blue-500"
              />
              <Label htmlFor="isTrial" className="cursor-pointer flex items-center gap-2 text-sm font-medium">
                <FlaskConical className="h-4 w-4 text-blue-500" />
                Período de teste (Trial)
              </Label>
            </div>

            {newForm.isTrial ? (
              <div className="space-y-2">
                <Label>Duração do Trial (dias)</Label>
                <Input type="number" min="1" max="90"
                  value={newForm.trialDays}
                  onChange={(e) => setNewForm({ ...newForm, trialDays: e.target.value })} />
                <p className="text-xs text-muted-foreground">
                  O plugin funcionará por {newForm.trialDays || "3"} dia(s) a partir da criação, depois bloqueará automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Data de Expiração (opcional)</Label>
                <Input type="date"
                  value={newForm.expiresAt}
                  onChange={(e) => setNewForm({ ...newForm, expiresAt: e.target.value })} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input placeholder="Notas internas sobre esta licença"
                value={newForm.notes}
                onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar Licença
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Bloqueio */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Bloquear Licença Permanentemente
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. A licença de <strong>{licenseToBlock?.customerName}</strong> será bloqueada permanentemente e o plugin parará de funcionar para sempre.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)} disabled={isBlocking}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBlock} disabled={isBlocking} className="gap-2">
              {isBlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Bloquear Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Remover Licença
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a licença de <strong>{licenseToDelete?.customerName}</strong>? O plugin perderá acesso imediatamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-2">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
