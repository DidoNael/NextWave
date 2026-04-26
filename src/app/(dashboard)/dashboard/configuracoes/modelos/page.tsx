"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, FileText, Plus, Loader2, XCircle, Pencil, Star, StarOff, Eye } from "lucide-react";

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    isDefault: boolean;
    createdAt: string;
}

interface NfseTipo {
    id: string;
    nome: string;
    itemListaServico: string;
    aliquotaIss: number;
    issRetido: string;
    naturezaOperacao: string;
    discriminacaoModelo: string;
    isDefault: boolean;
}

const PLACEHOLDER_HINTS = [
    { key: "{{nomeCliente}}", desc: "Nome do cliente" },
    { key: "{{numero}}", desc: "Número da NFS-e" },
    { key: "{{valor}}", desc: "Valor formatado em BRL" },
    { key: "{{discriminacao}}", desc: "Discriminação do serviço" },
    { key: "{{linkNfse}}", desc: "Botão link para visualizar a nota" },
    { key: "{{codigoVerificacao}}", desc: "Código de verificação GINFES" },
];

export default function ModelosPage() {
    // ── Email Templates ──────────────────────────────────────────────────────
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [emailLoading, setEmailLoading] = useState(true);
    const [emailModal, setEmailModal] = useState<{ open: boolean; editing: EmailTemplate | null }>({ open: false, editing: null });
    const [emailSaving, setEmailSaving] = useState(false);
    const [emailDeleting, setEmailDeleting] = useState<string | null>(null);
    const [emailPreview, setEmailPreview] = useState<EmailTemplate | null>(null);
    const [emailForm, setEmailForm] = useState({ name: "", subject: "", body: "", isDefault: false });

    // ── NFS-e Tipos ──────────────────────────────────────────────────────────
    const [tipos, setTipos] = useState<NfseTipo[]>([]);
    const [tiposLoading, setTiposLoading] = useState(true);
    const [tipoModal, setTipoModal] = useState<{ open: boolean; editing: NfseTipo | null }>({ open: false, editing: null });
    const [tipoSaving, setTipoSaving] = useState(false);
    const [tipoDeleting, setTipoDeleting] = useState<string | null>(null);
    const [tipoForm, setTipoForm] = useState({
        nome: "", itemListaServico: "", aliquotaIss: "", issRetido: "2",
        naturezaOperacao: "1", discriminacaoModelo: "", isDefault: false,
    });

    const fetchEmailTemplates = async () => {
        setEmailLoading(true);
        try {
            const res = await fetch("/api/modelos/email");
            if (res.ok) setEmailTemplates(await res.json());
        } catch { /* silencioso */ } finally { setEmailLoading(false); }
    };

    const fetchTipos = async () => {
        setTiposLoading(true);
        try {
            const res = await fetch("/api/nfse/tipos");
            if (res.ok) setTipos(await res.json());
        } catch { /* silencioso */ } finally { setTiposLoading(false); }
    };

    useEffect(() => { fetchEmailTemplates(); fetchTipos(); }, []);

    // ── Email CRUD ───────────────────────────────────────────────────────────
    const openEmailModal = (editing: EmailTemplate | null = null) => {
        setEmailForm(editing
            ? { name: editing.name, subject: editing.subject, body: editing.body, isDefault: editing.isDefault }
            : { name: "", subject: "NFS-e nº {{numero}} emitida — {{valor}}", body: DEFAULT_EMAIL_BODY, isDefault: false }
        );
        setEmailModal({ open: true, editing });
    };

    const handleSaveEmail = async () => {
        if (!emailForm.name || !emailForm.subject || !emailForm.body) {
            return toast.error("Preencha nome, assunto e corpo do e-mail");
        }
        setEmailSaving(true);
        try {
            const url = emailModal.editing ? `/api/modelos/email/${emailModal.editing.id}` : "/api/modelos/email";
            const method = emailModal.editing ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(emailForm),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Erro ao salvar");
            toast.success(emailModal.editing ? "Modelo atualizado" : "Modelo criado");
            setEmailModal({ open: false, editing: null });
            fetchEmailTemplates();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setEmailSaving(false);
        }
    };

    const handleDeleteEmail = async (id: string) => {
        if (!confirm("Excluir este modelo de e-mail?")) return;
        setEmailDeleting(id);
        try {
            const res = await fetch(`/api/modelos/email/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success("Modelo excluído");
            fetchEmailTemplates();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setEmailDeleting(null);
        }
    };

    // ── NFS-e Tipo CRUD ──────────────────────────────────────────────────────
    const openTipoModal = (editing: NfseTipo | null = null) => {
        setTipoForm(editing
            ? {
                nome: editing.nome, itemListaServico: editing.itemListaServico,
                aliquotaIss: String(editing.aliquotaIss * 100),
                issRetido: editing.issRetido || "2", naturezaOperacao: editing.naturezaOperacao || "1",
                discriminacaoModelo: editing.discriminacaoModelo || "", isDefault: editing.isDefault,
            }
            : { nome: "", itemListaServico: "", aliquotaIss: "", issRetido: "2", naturezaOperacao: "1", discriminacaoModelo: "", isDefault: false }
        );
        setTipoModal({ open: true, editing });
    };

    const handleSaveTipo = async () => {
        if (!tipoForm.nome || !tipoForm.itemListaServico || !tipoForm.aliquotaIss) {
            return toast.error("Preencha nome, item e alíquota");
        }
        setTipoSaving(true);
        try {
            const payload = { ...tipoForm, aliquotaIss: parseFloat(tipoForm.aliquotaIss) / 100 };
            const url = tipoModal.editing ? `/api/nfse/tipos/${tipoModal.editing.id}` : "/api/nfse/tipos";
            const method = tipoModal.editing ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(tipoModal.editing ? "Modelo atualizado" : "Modelo criado");
            setTipoModal({ open: false, editing: null });
            fetchTipos();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setTipoSaving(false);
        }
    };

    const handleDeleteTipo = async (id: string) => {
        if (!confirm("Excluir este modelo fiscal?")) return;
        setTipoDeleting(id);
        try {
            const res = await fetch(`/api/nfse/tipos/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success("Modelo excluído");
            fetchTipos();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setTipoDeleting(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Modelos</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Configure modelos padrão de e-mail e parâmetros fiscais reutilizáveis.
                </p>
            </div>

            <Tabs defaultValue="email">
                <TabsList className="mb-4">
                    <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" />E-mail NFS-e</TabsTrigger>
                    <TabsTrigger value="fiscal" className="gap-2"><FileText className="h-4 w-4" />Tipos Fiscais</TabsTrigger>
                </TabsList>

                {/* ── Aba Email ─────────────────────────────────────────── */}
                <TabsContent value="email">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle>Modelos de E-mail</CardTitle>
                                <CardDescription>
                                    E-mails enviados automaticamente ao cliente quando a NFS-e é emitida.
                                    Use <code className="text-xs bg-muted px-1 rounded">{"{{placeholder}}"}</code> para substituição dinâmica.
                                </CardDescription>
                            </div>
                            <Button size="sm" className="gap-1.5 shrink-0" onClick={() => openEmailModal()}>
                                <Plus className="h-3.5 w-3.5" />
                                Novo Modelo
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {emailLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                            ) : emailTemplates.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Nenhum modelo cadastrado.</p>
                            ) : (
                                <div className="space-y-2">
                                    {emailTemplates.map(t => (
                                        <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-sm">{t.name}</span>
                                                    {t.isDefault && (
                                                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                            <Star className="h-3 w-3" /> Padrão
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">Assunto: {t.subject}</p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setEmailPreview(t)}>
                                                    <Eye className="h-3.5 w-3.5" /> Preview
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEmailModal(t)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="h-7 text-xs text-red-600 hover:text-red-700"
                                                    onClick={() => handleDeleteEmail(t.id)}
                                                    disabled={emailDeleting === t.id}
                                                >
                                                    {emailDeleting === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Placeholders reference */}
                            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/40">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Placeholders disponíveis:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                    {PLACEHOLDER_HINTS.map(p => (
                                        <div key={p.key} className="flex items-center gap-2 text-xs">
                                            <code className="bg-background px-1.5 py-0.5 rounded border text-primary font-mono">{p.key}</code>
                                            <span className="text-muted-foreground">{p.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Aba Fiscal ────────────────────────────────────────── */}
                <TabsContent value="fiscal">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle>Modelos de Serviço Fiscal</CardTitle>
                                <CardDescription>
                                    Parâmetros fiscais pré-configurados por tipo de serviço. Selecione ao emitir NFS-e ou associe ao cliente.
                                </CardDescription>
                            </div>
                            <Button size="sm" className="gap-1.5 shrink-0" onClick={() => openTipoModal()}>
                                <Plus className="h-3.5 w-3.5" />
                                Novo Modelo
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {tiposLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                            ) : tipos.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">Nenhum modelo cadastrado.</p>
                            ) : (
                                <div className="space-y-2">
                                    {tipos.map(t => (
                                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{t.nome}</span>
                                                    {t.isDefault && (
                                                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                            <Star className="h-3 w-3" /> Padrão
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Item {t.itemListaServico} · {(t.aliquotaIss * 100).toFixed(2)}% ISS ·{" "}
                                                    {t.issRetido === "1" ? "ISS Retido" : "ISS Não Retido"}
                                                    {t.discriminacaoModelo && ` · "${t.discriminacaoModelo.substring(0, 50)}${t.discriminacaoModelo.length > 50 ? "…" : ""}"`}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openTipoModal(t)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="h-7 text-xs text-red-600 hover:text-red-700"
                                                    onClick={() => handleDeleteTipo(t.id)}
                                                    disabled={tipoDeleting === t.id}
                                                >
                                                    {tipoDeleting === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Modal Email ─────────────────────────────────────────────────── */}
            {emailModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b flex items-center justify-between shrink-0">
                            <h2 className="font-bold">{emailModal.editing ? "Editar Modelo de E-mail" : "Novo Modelo de E-mail"}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setEmailModal({ open: false, editing: null })}>
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-5 space-y-4 overflow-y-auto flex-1">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Nome do Modelo *</Label>
                                <Input
                                    placeholder="ex: Confirmação de NFS-e"
                                    value={emailForm.name}
                                    onChange={e => setEmailForm(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Assunto *</Label>
                                <Input
                                    placeholder="ex: NFS-e nº {{numero}} emitida — {{valor}}"
                                    value={emailForm.subject}
                                    onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Corpo (HTML) *</Label>
                                <Textarea
                                    rows={12}
                                    className="font-mono text-xs"
                                    placeholder="<p>Olá {{nomeCliente}}...</p>"
                                    value={emailForm.body}
                                    onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground">Suporta HTML. Use os placeholders listados abaixo.</p>
                            </div>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={emailForm.isDefault}
                                    onChange={e => setEmailForm(f => ({ ...f, isDefault: e.target.checked }))}
                                    className="rounded"
                                />
                                Definir como modelo padrão (usado para clientes sem modelo específico)
                            </label>
                        </div>
                        <div className="p-5 border-t flex justify-end gap-3 shrink-0">
                            <Button variant="ghost" onClick={() => setEmailModal({ open: false, editing: null })}>Cancelar</Button>
                            <Button onClick={handleSaveEmail} disabled={emailSaving} className="gap-2">
                                {emailSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {emailModal.editing ? "Salvar" : "Criar Modelo"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Tipo Fiscal ────────────────────────────────────────────── */}
            {tipoModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-lg rounded-2xl border shadow-2xl">
                        <div className="p-5 border-b flex items-center justify-between">
                            <h2 className="font-bold">{tipoModal.editing ? "Editar Modelo Fiscal" : "Novo Modelo Fiscal"}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setTipoModal({ open: false, editing: null })}>
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Nome do Modelo *</Label>
                                <Input
                                    placeholder="ex: Manutenção em TI"
                                    value={tipoForm.nome}
                                    onChange={e => setTipoForm(f => ({ ...f, nome: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Item Lista de Serviço *</Label>
                                    <Input placeholder="ex: 1.07" value={tipoForm.itemListaServico} onChange={e => setTipoForm(f => ({ ...f, itemListaServico: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Alíquota ISS (%) *</Label>
                                    <Input type="number" step="0.01" placeholder="ex: 2.15" value={tipoForm.aliquotaIss} onChange={e => setTipoForm(f => ({ ...f, aliquotaIss: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">ISS Retido</Label>
                                    <Select value={tipoForm.issRetido} onValueChange={v => setTipoForm(f => ({ ...f, issRetido: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2">Não Retido</SelectItem>
                                            <SelectItem value="1">Retido na Fonte</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Natureza da Operação</Label>
                                    <Select value={tipoForm.naturezaOperacao} onValueChange={v => setTipoForm(f => ({ ...f, naturezaOperacao: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 - Tributação no Município</SelectItem>
                                            <SelectItem value="2">2 - Fora do Município</SelectItem>
                                            <SelectItem value="3">3 - Isenção</SelectItem>
                                            <SelectItem value="4">4 - Imune</SelectItem>
                                            <SelectItem value="5">5 - Exigibilidade Suspensa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Discriminação padrão (opcional)</Label>
                                <Input placeholder="Texto pré-preenchido na emissão" value={tipoForm.discriminacaoModelo} onChange={e => setTipoForm(f => ({ ...f, discriminacaoModelo: e.target.value }))} />
                            </div>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={tipoForm.isDefault} onChange={e => setTipoForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
                                Definir como modelo padrão
                            </label>
                        </div>
                        <div className="p-5 border-t flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setTipoModal({ open: false, editing: null })}>Cancelar</Button>
                            <Button onClick={handleSaveTipo} disabled={tipoSaving} className="gap-2">
                                {tipoSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {tipoModal.editing ? "Salvar" : "Criar Modelo"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Preview Modal ─────────────────────────────────────────────────── */}
            {emailPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="font-bold">Preview: {emailPreview.name}</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Assunto: {emailPreview.subject}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setEmailPreview(null)}>
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <div
                                className="prose prose-sm max-w-none border rounded-lg p-4 bg-white dark:bg-slate-900"
                                dangerouslySetInnerHTML={{ __html: emailPreview.body }}
                            />
                        </div>
                        <div className="p-4 border-t shrink-0 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setEmailPreview(null)}>Fechar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const DEFAULT_EMAIL_BODY = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#1e293b">Nota Fiscal de Serviço Emitida</h2>
  <p>Olá, <strong>{{nomeCliente}}</strong>.</p>
  <p>Sua NFS-e nº <strong>{{numero}}</strong> foi emitida com sucesso no valor de <strong>{{valor}}</strong>.</p>
  <p style="color:#64748b;font-size:14px">{{discriminacao}}</p>
  {{linkNfse}}
  <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0" />
  <p style="font-size:12px;color:#94a3b8">Este e-mail foi gerado automaticamente. Não responda.</p>
</div>`;
