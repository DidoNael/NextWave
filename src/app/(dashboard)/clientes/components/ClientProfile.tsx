"use client";

import { useState, useEffect } from "react";
import {
    X, User, Phone, Mail, MapPin, Building2,
    DollarSign, Clock, FileText, Plus, ExternalLink,
    Filter, Download, ChevronRight, Receipt, CreditCard,
    TrendingUp, TrendingDown, Edit, Trash2, MessageSquare,
    QrCode, Loader2, Save, Briefcase, PauseCircle, Ban, CheckCircle
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatDate, getInitials, cn } from "@/lib/utils";
import { toast } from "sonner";
import { ClientDashboardTabs } from "./ClientDashboardTabs";
import { ClientCadastroTab } from "./ClientCadastroTab";
import { ClientServicosTab } from "./ClientServicosTab";
import { ClientFinanceiroTab } from "./ClientFinanceiroTab";

interface ClientProfileProps {
    clientId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit?: (client: any) => void;
}

const CATEGORIAS_RECEITA = ["Desenvolvimento", "Consultoria", "Manutenção", "Design", "Marketing", "Suporte", "Plugin Grafana", "Outros"];
const CATEGORIAS_DESPESA = ["Infraestrutura", "Software", "Pessoal", "Marketing", "Equipamentos", "Serviços", "Outros"];

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ClientProfile({ clientId, open, onOpenChange, onEdit }: ClientProfileProps) {
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Transaction CRUD
    const [txDialogOpen, setTxDialogOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<any>(null);
    const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
    const [txSaving, setTxSaving] = useState(false);
    const [txForm, setTxForm] = useState({
        description: "",
        amount: "",
        type: "receita" as "receita" | "despesa",
        category: "",
        status: "pendente" as "pendente" | "pago" | "cancelado",
        dueDate: "",
        notes: "",
    });

    // Status do cliente
    const [statusDialog, setStatusDialog] = useState<"pausado" | "bloqueado" | "ativo" | null>(null);
    const [statusSaving, setStatusSaving] = useState(false);

    // Service CRUD
    const [svcDialogOpen, setSvcDialogOpen] = useState(false);
    const [svcSaving, setSvcSaving] = useState(false);
    const [cancelSvcId, setCancelSvcId] = useState<string | null>(null);
    const [svcForm, setSvcForm] = useState({
        title: "",
        description: "",
        amount: "",
        category: "Desenvolvimento",
        status: "rascunho",
        dueDate: "",
        billingFrequency: "avulso",
        paymentReceived: false,
        paymentMethod: "Pix",
        notes: "",
    });

    useEffect(() => {
        if (open && clientId) {
            fetchClientDetails();
        }
    }, [open, clientId]);

    const fetchClientDetails = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/clientes/${clientId}`);
            if (res.ok) {
                const data = await res.json();
                setClient(data);
            }
        } catch (error) {
            toast.error("Erro ao carregar detalhes do cliente");
        } finally {
            setLoading(false);
        }
    };

    const changeClientStatus = async (newStatus: "pausado" | "bloqueado" | "ativo") => {
        setStatusSaving(true);
        try {
            const res = await fetch(`/api/clientes/${clientId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error();
            toast.success(
                newStatus === "pausado" ? "Acesso pausado com sucesso!" :
                newStatus === "bloqueado" ? "Cliente bloqueado definitivamente!" :
                "Cliente reativado com sucesso!"
            );
            setStatusDialog(null);
            fetchClientDetails();
        } catch {
            toast.error("Erro ao atualizar status do cliente");
        } finally {
            setStatusSaving(false);
        }
    };

    const transactions = client?.transactions || [];
    const totalReceita = transactions
        .filter((t: any) => t.type === "receita" && t.status === "pago")
        .reduce((s: number, t: any) => s + t.amount, 0);
    const totalDespesa = transactions
        .filter((t: any) => t.type === "despesa" && t.status === "pago")
        .reduce((s: number, t: any) => s + t.amount, 0);
    const totalPendente = transactions
        .filter((t: any) => t.status === "pendente")
        .reduce((s: number, t: any) => s + t.amount, 0);

    const openCreateTx = (defaultType: "receita" | "despesa" = "receita") => {
        toast.info("As transações devem ser geradas através do menu de Serviços para manter a consistência financeira.");
        // Mantendo a função mas bloqueando ou avisando conforme solicitado
        return;
    };

    const openEditTx = (tx: any) => {
        setEditingTx(tx);
        setTxForm({
            description: tx.description,
            amount: String(tx.amount),
            type: tx.type,
            category: tx.category,
            status: tx.status,
            dueDate: tx.dueDate ? new Date(tx.dueDate).toISOString().split("T")[0] : "",
            notes: tx.notes || "",
        });
        setTxDialogOpen(true);
    };

    const saveTx = async () => {
        if (!txForm.description || !txForm.amount || !txForm.category) {
            toast.error("Preencha os campos obrigatórios");
            return;
        }
        setTxSaving(true);
        try {
            const payload = {
                ...txForm,
                amount: parseFloat(txForm.amount),
                clientId,
            };
            const url = editingTx ? `/api/financeiro/${editingTx.id}` : "/api/financeiro";
            const method = editingTx ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error();
            toast.success(editingTx ? "Transação atualizada!" : "Transação criada!");
            setTxDialogOpen(false);
            fetchClientDetails();
        } catch {
            toast.error("Erro ao salvar transação");
        } finally {
            setTxSaving(false);
        }
    };

    const deleteTx = async () => {
        if (!deleteTxId) return;
        try {
            await fetch(`/api/financeiro/${deleteTxId}`, { method: "DELETE" });
            toast.success("Transação removida!");
            setDeleteTxId(null);
            fetchClientDetails();
        } catch {
            toast.error("Erro ao remover transação");
        }
    };

    const openCreateSvc = () => {
        setSvcForm({
            title: "", description: "", amount: "", category: "Desenvolvimento",
            status: "rascunho", dueDate: "", billingFrequency: "avulso",
            paymentReceived: false, paymentMethod: "Pix", notes: "",
        });
        setSvcDialogOpen(true);
    };

    const saveSvc = async () => {
        if (!svcForm.title || !svcForm.amount || !svcForm.dueDate) {
            toast.error("Preencha os campos obrigatórios (incluindo vencimento)");
            return;
        }
        setSvcSaving(true);
        try {
            const res = await fetch("/api/servicos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...svcForm,
                    amount: parseFloat(svcForm.amount),
                    clientId,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success("Serviço e faturamento gerados com sucesso!");
            setSvcDialogOpen(false);
            fetchClientDetails();
        } catch {
            toast.error("Erro ao criar serviço");
        } finally {
            setSvcSaving(false);
        }
    };

    const cancelSvc = async () => {
        if (!cancelSvcId) return;
        try {
            const res = await fetch(`/api/servicos/${cancelSvcId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "cancelado" }),
            });
            if (!res.ok) throw new Error();
            toast.success("Serviço marcado como cancelado!");
            setCancelSvcId(null);
            fetchClientDetails();
        } catch {
            toast.error("Erro ao cancelar o serviço");
        }
    };

    if (loading && !client) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl h-[85vh] flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-slate-50 dark:bg-slate-950/20 backdrop-blur-3xl border-none shadow-2xl rounded-3xl">
                    {/* Header */}
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 border-b border-border/40 flex items-start justify-between">
                        <div className="flex items-center gap-5">
                            <Avatar className="h-20 w-20 border-4 border-white dark:border-slate-800 shadow-xl">
                                <AvatarFallback className="bg-indigo-600 text-white text-3xl font-bold">
                                    {getInitials(client?.name || "")}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-3xl font-extrabold tracking-tight">{client?.name}</h2>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={() => onEdit?.(client)}
                                    >
                                        <Edit className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    {client?.status === "ativo" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs gap-1 border-yellow-500/50 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                                            onClick={() => setStatusDialog("pausado")}
                                        >
                                            <PauseCircle className="h-3.5 w-3.5" /> Pausar
                                        </Button>
                                    )}
                                    {client?.status === "pausado" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs gap-1 border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                                            onClick={() => setStatusDialog("ativo")}
                                        >
                                            <CheckCircle className="h-3.5 w-3.5" /> Reativar
                                        </Button>
                                    )}
                                    {client?.status !== "bloqueado" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs gap-1 border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            onClick={() => setStatusDialog("bloqueado")}
                                        >
                                            <Ban className="h-3.5 w-3.5" /> Bloquear
                                        </Button>
                                    )}
                                    {client?.status === "bloqueado" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs gap-1 border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                                            onClick={() => setStatusDialog("ativo")}
                                        >
                                            <CheckCircle className="h-3.5 w-3.5" /> Reativar
                                        </Button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium uppercase tracking-wider">
                                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {client?.company || "Pessoa Física"}</span>
                                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                                    <Badge variant={
                                        client?.status === "ativo" ? "success" :
                                        client?.status === "pausado" ? "warning" :
                                        client?.status === "bloqueado" ? "destructive" :
                                        "secondary"
                                    }>{client?.status}</Badge>
                                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">ID: {client?.registrationId || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full w-full">
                            <div className="p-8">
                                <ClientDashboardTabs
                                    client={client}
                                    renderCadastro={() => <ClientCadastroTab client={client} onEdit={() => onEdit?.(client)} />}
                                    renderServicos={() => (
                                        <ClientServicosTab
                                            services={client?.services || []}
                                            openCreateSvc={openCreateSvc}
                                            formatCurrency={formatCurrency}
                                            onCancelSvc={(id: string) => setCancelSvcId(id)}
                                            onRefresh={fetchClientDetails}
                                        />
                                    )}
                                    renderFinanceiro={() => (
                                        <ClientFinanceiroTab
                                          transactions={transactions}
                                          totalReceita={totalReceita}
                                          totalDespesa={totalDespesa}
                                          totalPendente={totalPendente}
                                          openCreateTx={openCreateTx}
                                          openEditTx={openEditTx}
                                          setDeleteTxId={setDeleteTxId}
                                          formatCurrency={formatCurrency}
                                          clientPhone={client?.phone}
                                          clientName={client?.name}
                                        />
                                    )}
                                />
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialogs de CRUD Transação/Serviço */}
            {/* ... mantidos no Profile por enquanto para simplificar o estado compartilhado ... */}
            {/* Omitido aqui por brevidade na reescrita, mas presentes no arquivo final */}
            <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingTx ? "Editar Transação" : "Nova Transação"}</DialogTitle>
                        <DialogDescription>
                            {editingTx ? "Atualize os dados da transação." : "Preencha os dados da nova transação vinculada a este cliente."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={txForm.type} onValueChange={(v) => setTxForm({ ...txForm, type: v as "receita" | "despesa", category: "" })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="receita">Receita</SelectItem>
                                    <SelectItem value="despesa">Despesa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição *</Label>
                            <Input placeholder="Ex: Desenvolvimento de Website" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor (R$) *</Label>
                                <Input type="number" step="0.01" placeholder="0,00" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Categoria *</Label>
                                <Select value={txForm.category} onValueChange={(v) => setTxForm({ ...txForm, category: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {(txForm.type === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={txForm.status} onValueChange={(v) => setTxForm({ ...txForm, status: v as "pendente" | "pago" | "cancelado" })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="pago">Pago</SelectItem>
                                        <SelectItem value="cancelado">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Data de Vencimento</Label>
                                <Input type="date" value={txForm.dueDate} onChange={(e) => setTxForm({ ...txForm, dueDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea placeholder="Notas adicionais..." value={txForm.notes} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTxDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={saveTx} disabled={txSaving}>
                            {txSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            {editingTx ? "Atualizar" : "Cadastrar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTxId} onOpenChange={() => setDeleteTxId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Remover Transação</DialogTitle>
                        <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTxId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={deleteTx}>Remover</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!cancelSvcId} onOpenChange={() => setCancelSvcId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Cancelar Serviço</DialogTitle>
                        <DialogDescription>
                            Deseja cancelar este serviço? O serviço não será apagado, mas seu status passará para <strong>cancelado</strong>, mantendo o histórico de dados.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelSvcId(null)}>Voltar</Button>
                        <Button variant="destructive" onClick={cancelSvc}>Confirmar Cancelamento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Diálogo de confirmação de status */}
            <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {statusDialog === "pausado" && "Pausar acesso do cliente"}
                            {statusDialog === "bloqueado" && "Bloquear cliente definitivamente"}
                            {statusDialog === "ativo" && "Reativar cliente"}
                        </DialogTitle>
                        <DialogDescription>
                            {statusDialog === "pausado" && "O acesso do cliente será suspenso temporariamente. Você pode reativar a qualquer momento."}
                            {statusDialog === "bloqueado" && "O cliente será bloqueado de forma definitiva. Esta ação pode ser revertida manualmente."}
                            {statusDialog === "ativo" && "O cliente voltará ao status ativo normalmente."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusDialog(null)} disabled={statusSaving}>Cancelar</Button>
                        <Button
                            variant={statusDialog === "ativo" ? "default" : "destructive"}
                            onClick={() => statusDialog && changeClientStatus(statusDialog)}
                            disabled={statusSaving}
                        >
                            {statusSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            {statusDialog === "pausado" && "Confirmar Pausa"}
                            {statusDialog === "bloqueado" && "Confirmar Bloqueio"}
                            {statusDialog === "ativo" && "Confirmar Reativação"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={svcDialogOpen} onOpenChange={setSvcDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Novo Serviço / Orçamento</DialogTitle>
                        <DialogDescription>Cadastre um novo serviço para {client?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título do Serviço *</Label>
                            <Input placeholder="Ex: Criação de Logotipo" value={svcForm.title} onChange={(e) => setSvcForm({ ...svcForm, title: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea placeholder="Detalhes do serviço..." value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor (R$) *</Label>
                                <Input type="number" step="0.01" placeholder="0,00" value={svcForm.amount} onChange={(e) => setSvcForm({ ...svcForm, amount: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select value={svcForm.category} onValueChange={(v) => setSvcForm({ ...svcForm, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIAS_RECEITA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Periodicidade</Label>
                                <Select value={svcForm.billingFrequency} onValueChange={(v) => setSvcForm({ ...svcForm, billingFrequency: v })}>
                                    <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="avulso">Avulso (Único)</SelectItem>
                                        <SelectItem value="semanal">Semanal</SelectItem>
                                        <SelectItem value="mensal">Mensal</SelectItem>
                                        <SelectItem value="trimestral">Trimestral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Vencimento *</Label>
                                <Input type="date" value={svcForm.dueDate} onChange={(e) => setSvcForm({ ...svcForm, dueDate: e.target.value })} />
                            </div>
                        </div>

                        {/* Painel de licença para Plugin Grafana */}
                        {svcForm.category === "Plugin Grafana" && (
                            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 space-y-3">
                                <p className="text-xs font-semibold text-purple-500 flex items-center gap-2">🔑 Plugin Grafana — uma chave de licença será gerada automaticamente.</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isTrial"
                                        checked={(svcForm as any).isTrial || false}
                                        onChange={e => setSvcForm({ ...svcForm, isTrial: e.target.checked } as any)}
                                        className="h-4 w-4 accent-purple-500"
                                    />
                                    <label htmlFor="isTrial" className="text-xs font-medium text-muted-foreground cursor-pointer">Período de teste (Trial)</label>
                                </div>
                                {(svcForm as any).isTrial && (
                                    <div className="space-y-1">
                                        <Label className="text-xs">Duração do trial (dias)</Label>
                                        <Input
                                            type="number" min="1" max="90"
                                            value={(svcForm as any).trialDays || "3"}
                                            onChange={e => setSvcForm({ ...svcForm, trialDays: e.target.value } as any)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-row items-center justify-between rounded-xl border border-dashed p-3 bg-slate-50 dark:bg-slate-900/50">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Marcar como Pago?</Label>
                                <p className="text-[10px] text-muted-foreground uppercase">Gera receita no financeiro</p>
                            </div>
                            <Switch checked={svcForm.paymentReceived} onCheckedChange={(v: boolean) => setSvcForm({ ...svcForm, paymentReceived: v })} />
                        </div>

                        {svcForm.paymentReceived && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <Label className="text-sm font-bold">Meio de Pagamento</Label>
                                <Select value={svcForm.paymentMethod} onValueChange={(v) => setSvcForm({ ...svcForm, paymentMethod: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {["Pix", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Dinheiro"].map(m => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSvcDialogOpen(false)}>Cancelar</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveSvc} disabled={svcSaving}>
                            {svcSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Serviço
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
