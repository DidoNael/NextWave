"use client";

import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Key, Plus, Loader2, Copy, Trash2, CheckCircle2, XCircle, AlertCircle, Calendar, RefreshCw, Clock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface License {
  id: string;
  key: string;
  secretKey: string | null;
  customerName: string;
  domain: string | null;
  expiresAt: string | null;
  status: "active" | "suspended" | "blocked" | "expired";
  isTrial: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  clientId: string | null;
  graceDays: number;
  overdueDetectedAt: string | null;
  lastWarningAt: string | null;
  service?: { title: string } | null;
  client?: { name: string; id: string } | null;
}

interface ClientOption {
  id: string;
  name: string;
}

export default function PluginLicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [licenseToDelete, setLicenseToDelete] = useState<License | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Form states
  const [selectedClientId, setSelectedClientId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [domain, setDomain] = useState("");
  const [isTrial, setIsTrial] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("30");

  const fetchLicenses = async () => {
    try {
      const res = await fetch("/api/plugin-licenses");
      const data = await res.json();
      setLicenses(data);
    } catch (error) {
      toast.error("Erro ao carregar licenças");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clientes?all=true");
      const data = await res.json();
      if (data.clientes) setClients(data.clientes);
    } catch (error) {
      console.error("Erro ao buscar clientes");
    }
  };

  useEffect(() => {
    fetchLicenses();
    fetchClients();
  }, []);

  const handleCreate = async () => {
    if (!customerName) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/plugin-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          customerName: selectedClientId ? clients.find(c => c.id === selectedClientId)?.name : customerName, 
          clientId: selectedClientId || null,
          domain, 
          isTrial,
          expiresInDays: parseInt(expiresInDays)
        })
      });

      if (res.ok) {
        toast.success("Licença gerada com sucesso!");
        setCustomerName("");
        setDomain("");
        setIsTrial(false);
        fetchLicenses();
      } else {
        toast.error("Falha ao gerar licença");
      }
    } catch (error) {
      toast.error("Erro de conexão");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!licenseToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/plugin-licenses/${licenseToDelete.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast.success("Licença removida");
        setDeleteDialogOpen(false);
        setLicenseToDelete(null);
        fetchLicenses();
      } else {
        toast.error("Falha ao remover licença");
      }
    } catch (error) {
      toast.error("Erro ao remover");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: License["status"]) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/plugin-licenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        toast.success(`Status atualizado para ${status}`);
        fetchLicenses();
      } else {
        toast.error("Falha ao atualizar status");
      }
    } catch (error) {
      toast.error("Erro na requisição");
    } finally {
      setIsUpdating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Chave copiada!");
  };

  const getStatusBadge = (status: License["status"], isTrial?: boolean) => {
    if (isTrial && status === "active") {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Trial</Badge>;
    }
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Ativa</Badge>;
      case "suspended":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Suspensa</Badge>;
      case "blocked":
        return <Badge variant="destructive">Bloqueada</Badge>;
      case "expired":
        return <Badge variant="outline" className="opacity-50">Expirada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight theme-title">Licenças de Plugin</h1>
          <p className="text-muted-foreground text-sm">Gerencie o licenciamento externo para o plugin Grafana.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Nova Licença
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" /> 
                Gerar Nova Chave
              </DialogTitle>
              <DialogDescription>
                A chave será gerada automaticamente após a criação.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vincular Cliente</label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-1 focus:ring-primary"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">-- Personalizado (Sem Vínculo) --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              {!selectedClientId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Customizado</label>
                  <Input placeholder="Ex: Netstream Telecom" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Domínio (Opcional)</label>
                <Input placeholder="Ex: crm.netstream.net.br" value={domain} onChange={(e) => setDomain(e.target.value)} />
              </div>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isTrial" 
                    checked={isTrial} 
                    onChange={(e) => setIsTrial(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isTrial" className="text-sm cursor-pointer">Modo Trial</label>
                </div>
                {!isTrial && (
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-sm whitespace-nowrap">Expira em:</label>
                    <Input 
                        type="number" 
                        value={expiresInDays} 
                        onChange={(e) => setExpiresInDays(e.target.value)}
                        className="h-8 w-20 text-center"
                    />
                    <span className="text-xs text-muted-foreground">dias</span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating} className="w-full">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Criar Licença
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="kpi-card overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Licenças de Plugin</CardTitle>
              <select
                className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="todos">Todos os status</option>
                <option value="active">Ativa</option>
                <option value="suspended">Suspensa</option>
                <option value="blocked">Bloqueada</option>
              </select>
            </div>
            <Button variant="ghost" size="icon" onClick={() => fetchLicenses()} disabled={loading} className="h-8 w-8">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Cliente</TableHead>
                <TableHead>Serviço Vinculado</TableHead>
                <TableHead>Chave Pública / Secreta</TableHead>
                <TableHead>Inadimplente há</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="h-12 animate-pulse bg-muted/10" />
                  </TableRow>
                ))
              ) : licenses.filter(l => statusFilter === "todos" || l.status === statusFilter).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                        <Key className="h-8 w-8 opacity-20" />
                        <p>Nenhuma licença encontrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                licenses
                  .filter(l => statusFilter === "todos" || l.status === statusFilter)
                  .map((license) => {
                  const overdueDays = license.overdueDetectedAt
                    ? Math.floor((Date.now() - new Date(license.overdueDetectedAt).getTime()) / 86400000)
                    : null;
                  return (
                  <TableRow key={license.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold">
                      <div className="flex flex-col">
                        <span>{license.client?.name || license.customerName}</span>
                        {getStatusBadge(license.status, license.isTrial)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {license.service ? (
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {license.service.title}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Avulsa</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 group">
                          <code className="text-[10px] bg-muted px-2 py-0.5 rounded select-all font-mono opacity-80">
                            PK: {license.key}
                          </code>
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(license.key)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {license.secretKey && (
                          <div className="flex items-center gap-2 group">
                            <code className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded select-all font-mono opacity-80">
                              SK: {license.secretKey.slice(0, 8)}...
                            </code>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(license.secretKey ?? "")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {overdueDays !== null ? (
                        <span className={cn("flex items-center gap-1 font-medium", overdueDays >= 5 ? "text-destructive" : "text-amber-500")}>
                          <Clock className="h-3 w-3" />
                          {overdueDays} dia{overdueDays !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {license.isTrial
                          ? (license.trialEndsAt ? new Date(license.trialEndsAt).toLocaleDateString() : "Sem fim")
                          : (license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : "Vitalícia")
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {license.status === "active" ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-amber-500 hover:bg-amber-500/10"
                            title="Suspender"
                            onClick={() => handleUpdateStatus(license.id, "suspended")}
                            disabled={isUpdating}
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                        ) : license.status === "suspended" ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                            title="Reativar"
                            onClick={() => handleUpdateStatus(license.id, "active")}
                            disabled={isUpdating}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : null}

                        {license.status !== "blocked" ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Bloquear"
                            onClick={() => handleUpdateStatus(license.id, "blocked")}
                            disabled={isUpdating}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                            title="Desbloquear"
                            onClick={() => handleUpdateStatus(license.id, "active")}
                            disabled={isUpdating}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            setLicenseToDelete(license);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
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
