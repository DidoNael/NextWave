"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
    Mail, 
    Plus, 
    Settings2, 
    Trash2, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    Send, 
    AlertCircle,
    Server,
    Shield,
    History,
    RefreshCw,
    Search,
    ChevronRight,
    Lock,
    Eye,
    EyeOff
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SmtpConfig {
    id: string;
    name: string;
    host: string;
    port: number;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string | null;
    secure: boolean;
    isActive: boolean;
    isDefault: boolean;
    updatedAt: string;
}

export default function SmtpConfigPage() {
    const [configs, setConfigs] = useState<SmtpConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    
    const [editingSmtp, setEditingSmtp] = useState<Partial<SmtpConfig> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const [testDialogOpen, setTestDialogOpen] = useState(false);
    const [testSmtp, setTestSmtp] = useState<SmtpConfig | null>(null);
    const [testEmail, setTestEmail] = useState("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/configuracoes/smtp");
            if (res.ok) {
                const data = await res.json();
                setConfigs(data);
            }
        } catch {
            toast.error("Erro ao carregar configurações SMTP");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const handleOpenCreate = () => {
        setEditingSmtp({
            name: "",
            host: "",
            port: 587,
            user: "",
            pass: "",
            fromEmail: "",
            fromName: "",
            secure: false,
            isDefault: configs.length === 0,
            isActive: true
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (smtp: SmtpConfig) => {
        setEditingSmtp(smtp);
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!editingSmtp?.name || !editingSmtp?.host || !editingSmtp?.user || !editingSmtp?.pass || !editingSmtp?.fromEmail) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        setSaving(true);
        try {
            const isEdit = !!editingSmtp.id;
            const url = isEdit ? `/api/configuracoes/smtp/${editingSmtp.id}` : "/api/configuracoes/smtp";
            const method = isEdit ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingSmtp)
            });

            if (res.ok) {
                toast.success(isEdit ? "Configuração atualizada" : "Configuração criada");
                setIsDialogOpen(false);
                fetchConfigs();
            } else {
                const err = await res.json();
                toast.error(err.error || "Erro ao salvar configuração");
            }
        } catch {
            toast.error("Ocorreu um erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta configuração SMTP?")) return;

        try {
            const res = await fetch(`/api/configuracoes/smtp/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Configuração excluída");
                fetchConfigs();
            } else {
                toast.error("Erro ao excluir");
            }
        } catch {
            toast.error("Erro ao excluir");
        }
    };

    const handleTest = async () => {
        if (!testEmail) {
            toast.error("Informe o e-mail de destino");
            return;
        }

        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch("/api/configuracoes/smtp/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...testSmtp,
                    toEmail: testEmail
                })
            });

            const data = await res.json();
            if (res.ok) {
                setTestResult({ 
                    success: true, 
                    message: "E-mail de teste enviado com sucesso! Verifique sua caixa de entrada." 
                });
            } else {
                setTestResult({ 
                    success: false, 
                    message: data.error || "Falha na conexão SMTP",
                    details: data
                });
            }
        } catch (err: any) {
            setTestResult({ 
                success: false, 
                message: "Erro de conexão com a API de teste",
                details: err
            });
        } finally {
            setTesting(false);
        }
    };

    const filteredConfigs = configs.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.host.toLowerCase().includes(search.toLowerCase()) ||
        c.user.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">SMTP / E-mail</h1>
                    <p className="text-muted-foreground mt-1">Gerencie as contas de e-mail utilizadas para envios do sistema.</p>
                </div>
                <Button onClick={handleOpenCreate} className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    Novo SMTP
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                <Mail className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Configurações</p>
                                <p className="text-2xl font-bold">{configs.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Contas Ativas</p>
                                <p className="text-2xl font-bold">{configs.filter(c => c.isActive).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                                <Shield className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">SSL/TLS Habilitado</p>
                                <p className="text-2xl font-bold">{configs.filter(c => c.secure).length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List & Search */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-lg">Contas Configuradas</CardTitle>
                            <CardDescription>Lista de servidores SMTP disponíveis para uso.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 bg-muted/30 focus:bg-background transition-colors"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Carregando configurações...</p>
                        </div>
                    ) : filteredConfigs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed rounded-xl border-border/60">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <Server className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Nenhuma configuração encontrada</p>
                            <Button variant="outline" size="sm" onClick={handleOpenCreate}>Criar Primeira Conta</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredConfigs.map(smtp => (
                                <div 
                                    key={smtp.id}
                                    className={cn(
                                        "group relative flex items-start gap-4 p-5 rounded-2xl border transition-all hover:shadow-md",
                                        smtp.isDefault ? "border-primary/40 bg-primary/5" : "border-border hover:border-border/80"
                                    )}
                                >
                                    <div className={cn(
                                        "p-3 rounded-xl shrink-0",
                                        smtp.isActive ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                        <Mail className="h-5 w-5" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-foreground truncate">{smtp.name}</h3>
                                            {smtp.isDefault && <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px] h-5">PADRÃO</Badge>}
                                            {!smtp.isActive && <Badge variant="outline" className="text-[10px] h-5">INATIVO</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono truncate">{smtp.host}:{smtp.port}</p>
                                        <p className="text-xs text-muted-foreground truncate">{smtp.user}</p>
                                        
                                        <div className="flex items-center gap-4 pt-3">
                                            <button 
                                                onClick={() => handleOpenEdit(smtp)}
                                                className="text-xs font-semibold text-primary/80 hover:text-primary transition-colors flex items-center gap-1"
                                            >
                                                <Settings2 className="h-3 w-3" />
                                                Configurar
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setTestSmtp(smtp);
                                                    setTestDialogOpen(true);
                                                    setTestResult(null);
                                                }}
                                                className="text-xs font-semibold text-emerald-600/80 hover:text-emerald-600 transition-colors flex items-center gap-1"
                                            >
                                                <Send className="h-3 w-3" />
                                                Testar Envio
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(smtp.id)}
                                                className="text-xs font-semibold text-destructive/70 hover:text-destructive transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 mt-1" />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[550px] overflow-hidden rounded-2xl p-0 border-none shadow-2xl">
                    <div className="bg-primary px-6 py-8 text-primary-foreground relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Settings2 className="h-32 w-32" />
                        </div>
                        <DialogTitle className="text-2xl font-black">Configuração SMTP</DialogTitle>
                        <DialogDescription className="text-primary-foreground/80 mt-1">
                            {editingSmtp?.id ? "Atualize os detalhes do servidor." : "Adicione um novo servidor de e-mail."}
                        </DialogDescription>
                    </div>

                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Identificador</Label>
                                <Input 
                                    placeholder="Ex: Gmail Corporativo" 
                                    value={editingSmtp?.name || ""}
                                    onChange={e => setEditingSmtp({ ...editingSmtp, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Servidor (Host)</Label>
                                <Input 
                                    placeholder="smtp.example.com" 
                                    value={editingSmtp?.host || ""}
                                    onChange={e => setEditingSmtp({ ...editingSmtp, host: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Porta</Label>
                                <Input 
                                    type="number" 
                                    placeholder="587" 
                                    value={editingSmtp?.port || ""}
                                    onChange={e => setEditingSmtp({ ...editingSmtp, port: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuário / Login</Label>
                                <Input 
                                    placeholder="email@dominio.com" 
                                    value={editingSmtp?.user || ""}
                                    onChange={e => setEditingSmtp({ ...editingSmtp, user: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Senha</Label>
                                <div className="relative">
                                    <Input 
                                        type={showPass ? "text" : "password"}
                                        placeholder="••••••••" 
                                        value={editingSmtp?.pass || ""}
                                        onChange={e => setEditingSmtp({ ...editingSmtp, pass: e.target.value })}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail de Remetente</Label>
                                <Input 
                                    placeholder="suporte@empresa.com" 
                                    value={editingSmtp?.fromEmail || ""}
                                    onChange={e => setEditingSmtp({ ...editingSmtp, fromEmail: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome de Exibição</Label>
                                <Input 
                                    placeholder="Atendimento Empresa" 
                                    value={editingSmtp?.fromName || ""}
                                    onChange={e => setEditingSmtp({ ...editingSmtp, fromName: e.target.value })}
                                />
                            </div>
                        </div>

                        <Separator className="my-2" />

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold">Conexão Segura (SSL/TLS)</Label>
                                    <p className="text-xs text-muted-foreground">Habilitar criptografia na conexão.</p>
                                </div>
                                <Switch 
                                    checked={editingSmtp?.secure || false}
                                    onCheckedChange={v => setEditingSmtp({ ...editingSmtp, secure: v })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold">Definir como Padrão</Label>
                                    <p className="text-xs text-muted-foreground">Usar esta conta para todos os envios automáticos.</p>
                                </div>
                                <Switch 
                                    checked={editingSmtp?.isDefault || false}
                                    onCheckedChange={v => setEditingSmtp({ ...editingSmtp, isDefault: v })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold">Conta Ativa</Label>
                                    <p className="text-xs text-muted-foreground">Permitir envios através desta conta.</p>
                                </div>
                                <Switch 
                                    checked={editingSmtp?.isActive || false}
                                    onCheckedChange={v => setEditingSmtp({ ...editingSmtp, isActive: v })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="bg-muted/30 p-6">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Salvar Configuração
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Test Dialog */}
            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-emerald-600" />
                            Testar Conexão SMTP
                        </DialogTitle>
                        <DialogDescription>
                            Envie um e-mail de teste para verificar se as configurações do servidor <strong>{testSmtp?.name}</strong> estão corretas.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>E-mail de Destino</Label>
                            <Input 
                                type="email" 
                                placeholder="seu-email@exemplo.com" 
                                value={testEmail}
                                onChange={e => setTestEmail(e.target.value)}
                            />
                        </div>

                        {testResult && (
                            <div className={cn(
                                "p-4 rounded-xl border flex flex-col gap-2",
                                testResult.success ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
                            )}>
                                <div className="flex items-center gap-2 font-bold">
                                    {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                    {testResult.success ? "Sucesso!" : "Erro no Teste"}
                                </div>
                                <p className="text-sm opacity-90">{testResult.message}</p>
                                
                                {!testResult.success && testResult.details && (
                                    <div className="mt-2 bg-black/5 p-2 rounded text-[10px] font-mono overflow-auto max-h-32">
                                        <p>Código: {testResult.details.code}</p>
                                        <p>Comando: {testResult.details.command}</p>
                                        <p className="mt-1 break-all">{testResult.details.error}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTestDialogOpen(false)} disabled={testing}>Fechar</Button>
                        <Button 
                            onClick={handleTest} 
                            disabled={testing || !testEmail} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Enviar Teste
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
