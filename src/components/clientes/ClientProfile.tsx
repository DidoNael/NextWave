"use client";

import { useState, useEffect } from "react";
import {
    X, User, Phone, Mail, MapPin, Building2,
    DollarSign, Clock, FileText, Plus, ExternalLink,
    Filter, Download, ChevronRight, Receipt, CreditCard,
    TrendingUp, TrendingDown, Edit, Trash2, MessageSquare,
    QrCode, Loader2, Save, Briefcase
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { formatDate, getInitials, cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClientProfileProps {
    clientId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CATEGORIAS_RECEITA = ["Desenvolvimento", "Consultoria", "Manutenção", "Design", "Marketing", "Suporte", "Outros"];
const CATEGORIAS_DESPESA = ["Infraestrutura", "Software", "Pessoal", "Marketing", "Equipamentos", "Serviços", "Outros"];

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ClientProfile({ clientId, open, onOpenChange }: ClientProfileProps) {
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

    // Subscription CRUD
    const [subDialogOpen, setSubDialogOpen] = useState(false);
    const [subSaving, setSubSaving] = useState(false);
    const [subForm, setSubForm] = useState({
        description: "",
        amount: "",
        interval: "monthly",
        nextBillingDate: new Date().toISOString().split("T")[0],
    });
    
    // Service CRUD
    const [svcDialogOpen, setSvcDialogOpen] = useState(false);
    const [svcSaving, setSvcSaving] = useState(false);
    const [svcForm, setSvcForm] = useState({
        title: "",
        description: "",
        amount: "",
        category: "Desenvolvimento",
        status: "rascunho",
        startDate: "",
        endDate: "",
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

    // ── KPI Calculations ────────────────────────────────────
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

    // ── Transaction CRUD ────────────────────────────────────
    const openCreateTx = (defaultType: "receita" | "despesa" = "receita") => {
        setEditingTx(null);
        setTxForm({
            description: "", amount: "", type: defaultType, category: "",
            status: "pendente", dueDate: "", notes: "",
        });
        setTxDialogOpen(true);
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

    // ── Subscription CRUD ───────────────────────────────────
    const openCreateSub = () => {
        setSubForm({
            description: "", amount: "",
            interval: "monthly",
            nextBillingDate: new Date().toISOString().split("T")[0],
        });
        setSubDialogOpen(true);
    };

    const saveSub = async () => {
        if (!subForm.description || !subForm.amount) {
            toast.error("Preencha os campos obrigatórios");
            return;
        }
        setSubSaving(true);
        try {
            const res = await fetch("/api/financeiro/assinaturas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...subForm,
                    amount: parseFloat(subForm.amount),
                    clientId,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success("Assinatura criada!");
            setSubDialogOpen(false);
            fetchClientDetails();
        } catch {
            toast.error("Erro ao criar assinatura");
        } finally {
            setSubSaving(false);
        }
    };

    // ── Service CRUD ────────────────────────────────────────
    const openCreateSvc = () => {
        setSvcForm({
            title: "", description: "", amount: "", category: "Desenvolvimento",
            status: "rascunho", startDate: "", endDate: "", notes: "",
        });
        setSvcDialogOpen(true);
    };

    const saveSvc = async () => {
        if (!svcForm.title || !svcForm.amount) {
            toast.error("Preencha os campos obrigatórios");
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
            toast.success("Serviço vinculado com sucesso!");
            setSvcDialogOpen(false);
            fetchClientDetails();
        } catch {
            toast.error("Erro ao criar serviço");
        } finally {
            setSvcSaving(false);
        }
    };

    if (loading && !client) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl h-[85vh] flex items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-slate-50 dark:bg-slate-950/20 backdrop-blur-3xl border-none shadow-2xl">
                    {/* Custom Header */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 border-b border-border/40 flex items-start justify-between">
                        <div className="flex items-center gap-5">
                            <Avatar className="h-20 w-20 border-4 border-white shadow-xl">
                                <AvatarFallback className="bg-indigo-600 text-white text-3xl font-bold">
                                    {getInitials(client?.name || "")}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h2 className="text-3xl font-extrabold tracking-tight">{client?.name}</h2>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {client?.company || "Pessoa Física"}</span>
                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                    <Badge variant={client?.status === "ativo" ? "success" : "secondary"} className="rounded-full px-3">{client?.status}</Badge>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar Info */}
                        <div className="w-80 border-r border-border/40 bg-white/40 dark:bg-slate-900/40 p-6 space-y-8 hidden md:block overflow-y-auto">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Dados de Contato</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 group">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                                            <Mail className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">E-mail</span>
                                            <span className="text-[11px] text-muted-foreground truncate">{client?.email || "Não informado"}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 group">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Telefone</span>
                                            <span className="text-[11px] text-muted-foreground">{client?.phone || "Não informado"}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 group">
                                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Localização</span>
                                            <span className="text-[11px] text-muted-foreground italic leading-tight">
                                                {client?.address ? `${client.address}, ${client.city}-${client.state}` : "Sem endereço"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* KPI Cards */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Resumo Financeiro</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-2xl bg-white border border-border/50 shadow-sm">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Receita</p>
                                        <p className="text-lg font-black text-emerald-600">{formatCurrency(totalReceita)}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white border border-border/50 shadow-sm">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Despesa</p>
                                        <p className="text-lg font-black text-red-600">{formatCurrency(totalDespesa)}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white border border-border/50 shadow-sm">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Pendente</p>
                                        <p className="text-lg font-black text-amber-600">{formatCurrency(totalPendente)}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white border border-border/50 shadow-sm">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Saldo</p>
                                        <p className={cn("text-lg font-black", totalReceita - totalDespesa >= 0 ? "text-blue-600" : "text-red-600")}>
                                            {formatCurrency(totalReceita - totalDespesa)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg font-bold py-5" onClick={() => openCreateTx("receita")}>
                                    <TrendingUp className="h-4 w-4 mr-2" /> Nova Receita
                                </Button>
                                <Button variant="outline" className="w-full rounded-xl font-bold py-5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => openCreateTx("despesa")}>
                                    <TrendingDown className="h-4 w-4 mr-2" /> Nova Despesa
                                </Button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-white/20 dark:bg-transparent overflow-hidden flex flex-col pt-4 px-6 pb-6">
                            <Tabs defaultValue="financeiro" className="h-full flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <TabsList className="bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-xl">
                                        <TabsTrigger value="financeiro" className="rounded-lg px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-md">Financeiro</TabsTrigger>
                                        <TabsTrigger value="assinaturas" className="rounded-lg px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-md">Mensalidades</TabsTrigger>
                                        <TabsTrigger value="servicos" className="rounded-lg px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-md">Serviços</TabsTrigger>
                                    </TabsList>
                                    <div className="flex items-center gap-2">
                                        {/* Mobile-only create button */}
                                        <Button size="sm" className="md:hidden h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700" onClick={() => openCreateTx("receita")}>
                                            <Plus className="h-4 w-4 mr-1" /> Novo
                                        </Button>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 -mx-2 px-2">
                                    {/* ── Financeiro Tab ── */}
                                    <TabsContent value="financeiro" className="mt-0 space-y-4 pr-1">
                                        {transactions.length > 0 ? (
                                            transactions.map((tx: any) => (
                                                <div key={tx.id} className="group flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                                                            tx.type === "receita" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                                        )}>
                                                            {tx.type === "receita" ? <DollarSign className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{tx.description}</p>
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                                                {tx.dueDate && <span>Vence em {formatDate(tx.dueDate)}</span>}
                                                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                                <span className="font-bold text-slate-500 uppercase">{tx.category}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right space-y-1">
                                                            <p className={cn(
                                                                "text-lg font-black",
                                                                tx.type === "receita" ? "text-emerald-500 font-mono" : "text-rose-500"
                                                            )}>
                                                                {tx.type === "receita" ? "+" : "-"} {formatCurrency(tx.amount)}
                                                            </p>
                                                            <Badge variant={tx.status === "pago" ? "success" : tx.status === "cancelado" ? "destructive" : "secondary"} className="text-[9px] uppercase font-black tracking-tighter rounded-full">
                                                                {tx.status}
                                                            </Badge>
                                                        </div>
                                                        {/* Action buttons */}
                                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTx(tx)}>
                                                                <Edit className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTxId(tx.id)}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                                                    <Receipt className="h-8 w-8 text-muted-foreground/40" />
                                                </div>
                                                <p className="text-sm text-muted-foreground font-medium">Nenhuma transação registrada para este cliente.</p>
                                                <Button variant="outline" size="sm" className="rounded-full px-8" onClick={() => openCreateTx("receita")}>
                                                    <Plus className="h-4 w-4 mr-2" /> Criar Primeira Transação
                                                </Button>
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* ── Assinaturas Tab ── */}
                                    <TabsContent value="assinaturas" className="mt-0 space-y-4 pr-1">
                                        <div className="flex justify-end mb-2">
                                            <Button size="sm" className="rounded-xl bg-purple-600 hover:bg-purple-700" onClick={openCreateSub}>
                                                <Plus className="h-4 w-4 mr-1" /> Nova Assinatura
                                            </Button>
                                        </div>
                                        {client?.subscriptions?.length > 0 ? (
                                            client.subscriptions.map((sub: any) => (
                                                <div key={sub.id} className="p-5 bg-white rounded-2xl border border-border shadow-sm space-y-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                                                                <Clock className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 dark:text-slate-100">{sub.description}</h4>
                                                                <p className="text-xs text-muted-foreground">Ciclo: <span className="text-indigo-600 font-bold uppercase">{sub.interval === "monthly" ? "Mensal" : "Anual"}</span></p>
                                                            </div>
                                                        </div>
                                                        <Badge variant={sub.status === "active" ? "success" : "destructive"}>{sub.status}</Badge>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-50">
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Próximo Faturamento</p>
                                                            <p className="text-sm font-bold">{formatDate(sub.nextBillingDate)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Valor do Plano</p>
                                                            <p className="text-lg font-black text-indigo-600">{formatCurrency(sub.amount)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                                                    <CreditCard className="h-8 w-8 text-muted-foreground/40" />
                                                </div>
                                                <p className="text-sm text-muted-foreground font-medium">Este cliente não possui serviços recorrentes.</p>
                                                <Button variant="outline" size="sm" className="rounded-full px-8" onClick={openCreateSub}>
                                                    <Plus className="h-4 w-4 mr-2" /> Configurar Plano
                                                </Button>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="servicos" className="mt-0 space-y-4 pr-1">
                                        <div className="flex justify-end mb-2">
                                            <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={openCreateSvc}>
                                                <Plus className="h-4 w-4 mr-1" /> Novo Serviço
                                            </Button>
                                        </div>
                                        {client?.services?.length > 0 ? (
                                            client.services.map((svc: any) => (
                                                <div key={svc.id} className="group flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-blue-500/30 hover:shadow-xl transition-all duration-300">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                                            <Briefcase className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{svc.title}</p>
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                                                <Badge variant="outline" className="text-[9px] uppercase">{svc.status}</Badge>
                                                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                                <span className="font-bold text-slate-500 uppercase">{svc.category || "Sem categoria"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-blue-600">{formatCurrency(svc.amount)}</p>
                                                        {svc.endDate && <p className="text-[9px] text-muted-foreground italic">Entrega: {formatDate(svc.endDate)}</p>}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                                                    <Briefcase className="h-8 w-8 text-muted-foreground/40" />
                                                </div>
                                                <p className="text-sm text-muted-foreground font-medium">Nenhum serviço vinculado a este cliente.</p>
                                                <Button variant="outline" size="sm" className="rounded-full px-8" onClick={openCreateSvc}>
                                                    <Plus className="h-4 w-4 mr-2" /> Cadastrar Serviço
                                                </Button>
                                            </div>
                                        )}
                                    </TabsContent>
                                </ScrollArea>
                            </Tabs>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Dialog: Criar/Editar Transação ── */}
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

            {/* ── Dialog: Confirmar Exclusão ── */}
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

            {/* ── Dialog: Nova Assinatura ── */}
            <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nova Assinatura Recorrente</DialogTitle>
                        <DialogDescription>Configure um faturamento automático para este cliente.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Descrição do Plano *</Label>
                            <Input placeholder="Ex: Manutenção Mensal VIP" value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor (R$) *</Label>
                                <Input type="number" step="0.01" placeholder="0,00" value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Intervalo</Label>
                                <Select value={subForm.interval} onValueChange={(v) => setSubForm({ ...subForm, interval: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Mensal</SelectItem>
                                        <SelectItem value="yearly">Anual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Data do Primeiro Faturamento</Label>
                            <Input type="date" value={subForm.nextBillingDate} onChange={(e) => setSubForm({ ...subForm, nextBillingDate: e.target.value })} />
                        </div>
                        <div className="bg-purple-500/5 border border-purple-500/10 p-3 rounded-lg text-[10px] text-muted-foreground">
                            Ao criar, o sistema gerará automaticamente uma transação e enviará o link via WhatsApp na data definida.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubDialogOpen(false)}>Cancelar</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={saveSub} disabled={subSaving}>
                            {subSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Criar Assinatura
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* ── Dialog: Novo Serviço ── */}
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
                                <Label>Data de Início</Label>
                                <Input type="date" value={svcForm.startDate} onChange={(e) => setSvcForm({ ...svcForm, startDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Previsão de Entrega</Label>
                                <Input type="date" value={svcForm.endDate} onChange={(e) => setSvcForm({ ...svcForm, endDate: e.target.value })} />
                            </div>
                        </div>
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
