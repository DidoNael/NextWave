"use client";

import { useState, useEffect, useRef } from "react";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    FileText, Upload, CheckCircle2, XCircle, Loader2,
    Building2, Key, Settings2, AlertTriangle, RefreshCw,
    RotateCcw, Code2, ExternalLink, Bug, Download
} from "lucide-react";

interface NfeConfig {
    cnpj: string;
    inscricaoMunicipal: string;
    razaoSocial: string;
    ambiente: string;
    hasCertificado: boolean;
    aliquotaIss: number;
    itemListaServico: string;
    codigoMunicipio: string;
    serieRps: string;
    tipoRps: string;
    naturezaOperacao: string;
    optanteSimplesNacional: string;
    regimeEspecialTributacao: string;
    incentivadorCultural: string;
    exigibilidadeIss: string;
    codigoTributacaoMunicipio: string | null;
    provider?: string;
    hasProviderCredentials?: boolean;
}

interface NfseRecord {
    id: string;
    rpsNumero: string;
    numeroNfse: string | null;
    codigoVerificacao: string | null;
    protocolo: string | null;
    status: string;
    valorServicos: number;
    discriminacao: string;
    tomadorNome: string | null;
    xmlEnviado: string | null;
    xmlRetorno: string | null;
    errorMessage: string | null;
    createdAt: string;
    emitidaEm: string | null;
    canceladaEm: string | null;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
    pendente: { label: "Pendente", color: "bg-slate-100 text-slate-700" },
    aguardando_processamento: { label: "Aguardando", color: "bg-blue-100 text-blue-700" },
    emitida: { label: "Emitida", color: "bg-green-100 text-green-700" },
    cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700" },
    erro: { label: "Erro", color: "bg-orange-100 text-orange-700" },
};

function CertCheck() {
    const [state, setState] = useState<{ loading: boolean; result: any | null }>({ loading: false, result: null });

    const check = async () => {
        setState({ loading: true, result: null });
        try {
            const res = await fetch('/api/configuracoes/nfe/cert-check');
            const data = await res.json();
            setState({ loading: false, result: data });
        } catch {
            setState({ loading: false, result: { ok: false, error: 'Erro ao verificar' } });
        }
    };

    return (
        <div className="mt-3 space-y-2">
            <Button type="button" variant="outline" size="sm" onClick={check} disabled={state.loading} className="gap-2">
                {state.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Verificar Certificado
            </Button>
            {state.result && (
                <div className={`p-3 rounded-lg border text-xs space-y-1 ${state.result.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    {state.result.ok ? (
                        <>
                            <p className="font-semibold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Certificado OK</p>
                            <p>CN: <strong>{state.result.cn}</strong></p>
                            <p>Validade: {new Date(state.result.notBefore).toLocaleDateString('pt-BR')} → {new Date(state.result.notAfter).toLocaleDateString('pt-BR')}</p>
                            {state.result.expired && <p className="text-red-700 font-semibold">⚠ Certificado vencido!</p>}
                            {state.result.aviso && <p className="text-amber-700 mt-1">{state.result.aviso}</p>}
                        </>
                    ) : (
                        <>
                            <p className="font-semibold flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Falha ao abrir certificado</p>
                            <p>{state.result.error}</p>
                            {state.result.fix && <p className="mt-1 font-mono break-all">{state.result.fix}</p>}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function NfeConfigPage() {
  const base = "/dashboard";
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [records, setRecords] = useState<NfseRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [recordPage, setRecordPage] = useState(1);
    const [recordPagination, setRecordPagination] = useState<{ total: number; totalPages: number } | null>(null);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [retryingId, setRetryingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [limpando, setLimpando] = useState(false);
    const [rotina, setRotina] = useState<{ running: boolean; result: any | null }>({ running: false, result: null });
    const [sync, setSync] = useState<{ running: boolean; forceAll: boolean; result: any | null }>({ running: false, forceAll: false, result: null });
    const [syncPeriodo, setSyncPeriodo] = useState({ de: '', ate: '' });
    const [importar, setImportar] = useState<{ running: boolean; result: any | null }>({ running: false, result: null });
    const [importarPeriodo, setImportarPeriodo] = useState({ de: '', ate: '' });
    const [xmlModal, setXmlModal] = useState<{ open: boolean; enviado: string; retorno: string; erro: string } | null>(null);
    const [xmlTab, setXmlTab] = useState<"enviado" | "retorno" | "erro">("retorno");
    const fileRef = useRef<HTMLInputElement>(null);

    // Modelos de tipo de serviço fiscal
    const [tipos, setTipos] = useState<any[]>([]);
    const [tipoModal, setTipoModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });
    const [tipoForm, setTipoForm] = useState({ nome: "", itemListaServico: "", aliquotaIss: "", issRetido: "2", naturezaOperacao: "1", discriminacaoModelo: "", isDefault: false });
    const [savingTipo, setSavingTipo] = useState(false);

    const [form, setForm] = useState({
        cnpj: "",
        inscricaoMunicipal: "",
        razaoSocial: "",
        ambiente: "homologacao",
        hasCertificado: false,
        aliquotaIss: "2",
        itemListaServico: "14.06",
        codigoMunicipio: "3514700",
        serieRps: "1",
        tipoRps: "1",
        naturezaOperacao: "1",
        optanteSimplesNacional: "2",
        regimeEspecialTributacao: "6",
        incentivadorCultural: "2",
        exigibilidadeIss: "1",
        codigoTributacaoMunicipio: "",
        // upload certificado (GINFES)
        certificadoBase64: "",
        senhaCertificado: "",
        certFileName: "",
        // provedor
        provider: "ginfes" as "ginfes" | "enotas",
        hasProviderCredentials: false,
        enotasApiKey: "",
        enotasEmpresaId: "",
    });

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/configuracoes/nfe");
            if (res.ok) {
                const data: NfeConfig = await res.json();
                setForm(prev => ({
                    ...prev,
                    cnpj: data.cnpj || "",
                    inscricaoMunicipal: data.inscricaoMunicipal || "",
                    razaoSocial: data.razaoSocial || "",
                    ambiente: data.ambiente || "homologacao",
                    hasCertificado: !!data.hasCertificado,
                    aliquotaIss: String((data.aliquotaIss || 0.02) * 100),
                    itemListaServico: data.itemListaServico || "14.06",
                    codigoMunicipio: data.codigoMunicipio || "3514700",
                    serieRps: data.serieRps || "1",
                    tipoRps: data.tipoRps || "1",
                    naturezaOperacao: data.naturezaOperacao || "1",
                    optanteSimplesNacional: data.optanteSimplesNacional || "2",
                    regimeEspecialTributacao: data.regimeEspecialTributacao || "6",
                    incentivadorCultural: data.incentivadorCultural || "2",
                    exigibilidadeIss: data.exigibilidadeIss || "1",
                    codigoTributacaoMunicipio: data.codigoTributacaoMunicipio || "",
                    provider: (data.provider as "ginfes" | "enotas") || "ginfes",
                    hasProviderCredentials: !!data.hasProviderCredentials,
                }));
            }
        } catch {
            toast.error("Erro ao carregar configuração");
        } finally {
            setLoading(false);
        }
    };

    const fetchRecords = async (page = recordPage) => {
        setLoadingRecords(true);
        try {
            const res = await fetch(`/api/nfse?page=${page}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records ?? data);
                if (data.pagination) setRecordPagination(data.pagination);
            }
        } catch { /* silencioso */ } finally {
            setLoadingRecords(false);
        }
    };

    const fetchTipos = async () => {
        try {
            const res = await fetch("/api/nfse/tipos");
            if (res.ok) setTipos(await res.json());
        } catch { /* silencioso */ }
    };

    const openTipoModal = (editing: any | null = null) => {
        setTipoForm(editing ? {
            nome: editing.nome, itemListaServico: editing.itemListaServico,
            aliquotaIss: String(editing.aliquotaIss * 100),
            issRetido: editing.issRetido || "2", naturezaOperacao: editing.naturezaOperacao || "1",
            discriminacaoModelo: editing.discriminacaoModelo || "", isDefault: editing.isDefault,
        } : { nome: "", itemListaServico: "", aliquotaIss: "", issRetido: "2", naturezaOperacao: "1", discriminacaoModelo: "", isDefault: false });
        setTipoModal({ open: true, editing });
    };

    const handleSaveTipo = async () => {
        if (!tipoForm.nome || !tipoForm.itemListaServico || !tipoForm.aliquotaIss) return toast.error("Preencha nome, item e alíquota");
        setSavingTipo(true);
        try {
            const payload = { ...tipoForm, aliquotaIss: parseFloat(tipoForm.aliquotaIss) / 100 };
            const url = tipoModal.editing ? `/api/nfse/tipos/${tipoModal.editing.id}` : "/api/nfse/tipos";
            const method = tipoModal.editing ? "PUT" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(tipoModal.editing ? "Modelo atualizado" : "Modelo criado");
            setTipoModal({ open: false, editing: null });
            fetchTipos();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSavingTipo(false);
        }
    };

    const handleDeleteTipo = async (id: string) => {
        if (!confirm("Excluir este modelo?")) return;
        try {
            await fetch(`/api/nfse/tipos/${id}`, { method: "DELETE" });
            toast.success("Modelo excluído");
            fetchTipos();
        } catch { toast.error("Erro ao excluir"); }
    };

    useEffect(() => {
        fetchConfig();
        fetchRecords();
        fetchTipos();
    }, []);

    const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(",")[1];
            setForm(prev => ({ ...prev, certificadoBase64: base64, certFileName: file.name }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = {
                cnpj: form.cnpj,
                inscricaoMunicipal: form.inscricaoMunicipal,
                razaoSocial: form.razaoSocial,
                ambiente: form.ambiente,
                aliquotaIss: parseFloat(form.aliquotaIss) / 100,
                itemListaServico: form.itemListaServico,
                codigoMunicipio: form.codigoMunicipio,
                serieRps: form.serieRps,
                tipoRps: form.tipoRps,
                naturezaOperacao: form.naturezaOperacao,
                optanteSimplesNacional: form.optanteSimplesNacional,
                regimeEspecialTributacao: form.regimeEspecialTributacao,
                incentivadorCultural: form.incentivadorCultural,
                exigibilidadeIss: form.exigibilidadeIss,
                codigoTributacaoMunicipio: form.codigoTributacaoMunicipio || null,
                provider: form.provider,
                ...(form.certificadoBase64 ? { certificadoBase64: form.certificadoBase64 } : {}),
                ...(form.senhaCertificado ? { senhaCertificado: form.senhaCertificado } : {}),
            };

            // Credenciais eNotas — só envia se algum campo foi preenchido
            if (form.provider === "enotas" && (form.enotasApiKey || form.enotasEmpresaId)) {
                payload.providerCredentials = {
                    apiKey:    form.enotasApiKey,
                    empresaId: form.enotasEmpresaId,
                };
            }

            const res = await fetch("/api/configuracoes/nfe", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erro ao salvar");
            }

            toast.success("Configuração salva!");
            setForm(prev => ({
                ...prev,
                certificadoBase64: "", senhaCertificado: "", certFileName: "",
                hasCertificado: prev.provider === "ginfes" ? true : prev.hasCertificado,
                enotasApiKey: "", enotasEmpresaId: "",
                hasProviderCredentials: prev.provider === "enotas" && !!(prev.enotasApiKey || prev.enotasEmpresaId)
                    ? true : prev.hasProviderCredentials,
            }));
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCheckStatus = async (id: string) => {
        setCheckingId(id);
        try {
            const res = await fetch(`/api/nfse/${id}`);
            const data = await res.json();
            if (data.status === "emitida") {
                toast.success(`NFS-e emitida! Número: ${data.numeroNfse}`);
            } else if (data.status === "erro") {
                toast.error("Processado com erro. Verifique o XML de retorno.");
            } else {
                toast.info(`Status: ${STATUS_CFG[data.status]?.label || data.status}`);
            }
            fetchRecords();
        } catch {
            toast.error("Erro ao consultar status");
        } finally {
            setCheckingId(null);
        }
    };

    const handleRetry = async (id: string) => {
        setRetryingId(id);
        try {
            const res = await fetch(`/api/nfse/${id}/retry`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao retentar");
            toast.success(data.protocolo ? `Reenviado! Protocolo: ${data.protocolo}` : "Reenviado para processamento");
            fetchRecords();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setRetryingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este registro? Ele será removido permanentemente do sistema.")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/nfse/${id}/excluir`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success("Registro excluído");
            fetchRecords();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleLimpar = async () => {
        const pendentes = records.filter(r => ['pendente', 'erro'].includes(r.status));
        if (pendentes.length === 0) return toast.info("Nenhum registro pendente ou com erro.");
        if (!confirm(`Excluir ${pendentes.length} registro(s) pendente(s)/erro? Esta ação é irreversível.`)) return;
        setLimpando(true);
        try {
            const res = await fetch("/api/nfse/limpar", { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`${data.removidos} registro(s) removido(s)`);
            fetchRecords();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLimpando(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Cancelar esta NFS-e? Esta ação é irreversível.")) return;
        try {
            const res = await fetch(`/api/nfse/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            toast.success("NFS-e cancelada");
            fetchRecords();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight">NFS-e / Notas Fiscais</h1>
                    <p className="text-muted-foreground text-sm">
                        Configure o provedor de emissão de Notas Fiscais de Serviço eletrônicas (NFS-e).
                    </p>
                </div>
                <a href={`${base}/configuracoes/nfe/debug`}>
                    <button className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors">
                        <Bug className="h-4 w-4" />
                        Diagnóstico
                    </button>
                </a>
            </div>

            {form.ambiente === "homologacao" && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Modo <strong>Homologação</strong> ativo — as notas emitidas são de teste e não têm validade fiscal.</span>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                {/* Seletor de Provedor */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Settings2 className="h-5 w-5" /></div>
                            <div>
                                <CardTitle>Provedor de NFS-e</CardTitle>
                                <CardDescription>
                                    Escolha o sistema de emissão. GINFES requer certificado digital A1;
                                    eNotas é um serviço em nuvem sem necessidade de certificado local.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {(["ginfes", "enotas"] as const).map(p => (
                                <label
                                    key={p}
                                    className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        form.provider === p
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/40"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="provider"
                                        value={p}
                                        checked={form.provider === p}
                                        onChange={() => setForm(f => ({ ...f, provider: p }))}
                                        className="sr-only"
                                    />
                                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        form.provider === p ? "border-primary" : "border-muted-foreground/40"
                                    }`}>
                                        {form.provider === p && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">
                                            {p === "ginfes" ? "GINFES" : "eNotas"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {p === "ginfes"
                                                ? "SOAP direto — requer certificado A1 (ICP-Brasil)"
                                                : "REST em nuvem — 60+ municípios, sem certificado local"}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Dados da Empresa */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Building2 className="h-5 w-5" /></div>
                            <div>
                                <CardTitle>Dados da Empresa Prestadora</CardTitle>
                                <CardDescription>Identificação fiscal para emissão das notas.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>CNPJ *</Label>
                            <Input
                                required
                                value={form.cnpj}
                                onChange={e => setForm({ ...form, cnpj: e.target.value })}
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Inscrição Municipal *</Label>
                            <Input
                                required
                                value={form.inscricaoMunicipal}
                                onChange={e => setForm({ ...form, inscricaoMunicipal: e.target.value })}
                                placeholder="Ex: 12345"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Razão Social *</Label>
                            <Input
                                required
                                value={form.razaoSocial}
                                onChange={e => setForm({ ...form, razaoSocial: e.target.value })}
                                placeholder="Nome da empresa conforme CNPJ"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ambiente</Label>
                            <Select value={form.ambiente} onValueChange={v => setForm({ ...form, ambiente: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="homologacao">Homologação (Teste)</SelectItem>
                                    <SelectItem value="producao">Produção</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Certificado Digital — apenas GINFES */}
                {form.provider === "ginfes" && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-500"><Key className="h-5 w-5" /></div>
                            <div>
                                <CardTitle>Certificado Digital</CardTitle>
                                <CardDescription>Certificado ICP-Brasil e-CNPJ A1 (.pfx / .p12) para assinar os XMLs.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                            {form.hasCertificado || form.certFileName ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                    {form.certFileName
                                        ? form.certFileName
                                        : form.hasCertificado
                                            ? "Certificado configurado"
                                            : "Nenhum certificado carregado"}
                                </p>
                                <p className="text-xs text-muted-foreground">Arquivo .pfx ou .p12</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                                <Upload className="h-3.5 w-3.5 mr-1.5" />
                                {form.hasCertificado ? "Substituir" : "Carregar"}
                            </Button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".pfx,.p12"
                                className="hidden"
                                onChange={handleCertUpload}
                            />
                        </div>
                        {(form.certFileName || form.hasCertificado) && (
                            <div className="space-y-2">
                                <Label>Senha do Certificado</Label>
                                <Input
                                    type="password"
                                    value={form.senhaCertificado}
                                    onChange={e => setForm({ ...form, senhaCertificado: e.target.value })}
                                    placeholder={form.hasCertificado ? "Deixe em branco para manter" : "Senha do arquivo .pfx"}
                                />
                            </div>
                        )}
                        {form.hasCertificado && (
                            <CertCheck />
                        )}
                    </CardContent>
                </Card>
                )}

                {/* Credenciais eNotas — apenas quando selecionado */}
                {form.provider === "enotas" && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-500"><Key className="h-5 w-5" /></div>
                            <div>
                                <CardTitle>Credenciais eNotas</CardTitle>
                                <CardDescription>
                                    API Key e ID da empresa no painel eNotas (<a href="https://app.enotas.com.br" target="_blank" rel="noopener noreferrer" className="underline">app.enotas.com.br</a>).
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {form.hasProviderCredentials && (
                            <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                Credenciais eNotas configuradas — deixe em branco para manter os valores atuais.
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>API Key *</Label>
                            <Input
                                type="password"
                                value={form.enotasApiKey}
                                onChange={e => setForm(f => ({ ...f, enotasApiKey: e.target.value }))}
                                placeholder={form.hasProviderCredentials ? "Deixe em branco para manter" : "Cole a API Key do painel eNotas"}
                                autoComplete="off"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ID da Empresa (eNotas) *</Label>
                            <Input
                                value={form.enotasEmpresaId}
                                onChange={e => setForm(f => ({ ...f, enotasEmpresaId: e.target.value }))}
                                placeholder={form.hasProviderCredentials ? "Deixe em branco para manter" : "UUID da empresa no painel eNotas"}
                            />
                        </div>
                    </CardContent>
                </Card>
                )}

                {/* Parâmetros de Serviço */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Settings2 className="h-5 w-5" /></div>
                            <div>
                                <CardTitle>Parâmetros Fiscais</CardTitle>
                                <CardDescription>Códigos e alíquotas conforme legislação municipal de Guarulhos.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Alíquota ISS (%)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.01"
                                value={form.aliquotaIss}
                                onChange={e => setForm({ ...form, aliquotaIss: e.target.value })}
                                placeholder="2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Item Lista de Serviço</Label>
                            <Input
                                value={form.itemListaServico}
                                onChange={e => setForm({ ...form, itemListaServico: e.target.value })}
                                placeholder="14.06"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Código do Município (IBGE)</Label>
                            <Input
                                value={form.codigoMunicipio}
                                onChange={e => setForm({ ...form, codigoMunicipio: e.target.value })}
                                placeholder="3514700 (Guarulhos)"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Série RPS</Label>
                            <Input value={form.serieRps} onChange={e => setForm({ ...form, serieRps: e.target.value })} placeholder="1" maxLength={5} />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo RPS</Label>
                            <Select value={form.tipoRps} onValueChange={v => setForm({ ...form, tipoRps: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 — RPS</SelectItem>
                                    <SelectItem value="2">2 — Nota Fiscal Conjugada</SelectItem>
                                    <SelectItem value="3">3 — Cupom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Natureza da Operação</Label>
                            <Select value={form.naturezaOperacao} onValueChange={v => setForm({ ...form, naturezaOperacao: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 — Tributação no município</SelectItem>
                                    <SelectItem value="2">2 — Tributação fora do município</SelectItem>
                                    <SelectItem value="3">3 — Isenção</SelectItem>
                                    <SelectItem value="4">4 — Imune</SelectItem>
                                    <SelectItem value="6">6 — Exigibilidade suspensa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Optante Simples Nacional</Label>
                            <Select value={form.optanteSimplesNacional} onValueChange={v => setForm({ ...form, optanteSimplesNacional: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Sim</SelectItem>
                                    <SelectItem value="2">Não</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Regime Especial Tributação</Label>
                            <Select value={form.regimeEspecialTributacao} onValueChange={v => setForm({ ...form, regimeEspecialTributacao: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 — Estimativa</SelectItem>
                                    <SelectItem value="2">2 — Soc. Profissionais</SelectItem>
                                    <SelectItem value="3">3 — Cooperativa</SelectItem>
                                    <SelectItem value="4">4 — MEI</SelectItem>
                                    <SelectItem value="5">5 — ME / EPP</SelectItem>
                                    <SelectItem value="6">6 — Nenhum</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Exigibilidade ISS</Label>
                            <Select value={form.exigibilidadeIss} onValueChange={v => setForm({ ...form, exigibilidadeIss: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 — Exigível</SelectItem>
                                    <SelectItem value="2">2 — Não Incidência</SelectItem>
                                    <SelectItem value="3">3 — Isenção</SelectItem>
                                    <SelectItem value="4">4 — Exportação</SelectItem>
                                    <SelectItem value="5">5 — Imunidade</SelectItem>
                                    <SelectItem value="6">6 — Suspensa por Dec. Judicial</SelectItem>
                                    <SelectItem value="7">7 — Suspensa por Proc. Adm.</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Incentivador Cultural</Label>
                            <Select value={form.incentivadorCultural} onValueChange={v => setForm({ ...form, incentivadorCultural: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Sim</SelectItem>
                                    <SelectItem value="2">Não</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Código Tributação Município</Label>
                            <Input
                                value={form.codigoTributacaoMunicipio}
                                onChange={e => setForm({ ...form, codigoTributacaoMunicipio: e.target.value })}
                                placeholder="ex: 620910003"
                            />
                            <p className="text-xs text-muted-foreground">Código municipal do serviço (parte após / no campo Serviço/Atividade do GINFES)</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="gap-2">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Salvar Configurações
                    </Button>
                </div>
            </form>

            <Separator />

            {/* Modelos de Tipo de Serviço */}
            <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                    <div>
                        <CardTitle>Modelos de Serviço Fiscal</CardTitle>
                        <CardDescription>Parâmetros fiscais por tipo de serviço. Selecione um modelo ao emitir NFS-e.</CardDescription>
                    </div>
                    <Button size="sm" className="gap-1.5" onClick={() => openTipoModal()}>
                        <Settings2 className="h-3.5 w-3.5" />
                        Novo Modelo
                    </Button>
                </CardHeader>
                <CardContent>
                    {tipos.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhum modelo cadastrado. Crie um para agilizar a emissão.</p>
                    ) : (
                        <div className="space-y-2">
                            {tipos.map(t => (
                                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{t.nome}</span>
                                            {t.isDefault && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Padrão</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Item {t.itemListaServico} · {(t.aliquotaIss * 100).toFixed(2)}% ISS · {t.issRetido === "1" ? "ISS Retido" : "ISS Não Retido"}
                                            {t.discriminacaoModelo && ` · "${t.discriminacaoModelo.substring(0, 40)}${t.discriminacaoModelo.length > 40 ? "…" : ""}"`}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openTipoModal(t)}>Editar</Button>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleDeleteTipo(t.id)}>Excluir</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Rotina em Lote */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-primary" /> Rotina de Emissão em Lote
                    </CardTitle>
                    <CardDescription>
                        Emite NFS-e automaticamente para todos os serviços ativos que ainda não possuem nota fiscal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {rotina.result && (
                        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
                            <p className="font-semibold">{rotina.result.summary}</p>
                            {rotina.result.failed?.length > 0 && (
                                <div className="space-y-0.5 mt-2">
                                    <p className="text-xs font-semibold text-destructive">Erros:</p>
                                    {rotina.result.failed.map((f: any) => (
                                        <p key={f.serviceId} className="text-xs text-destructive">• {f.title}: {f.error}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <Button
                        onClick={async () => {
                            setRotina({ running: true, result: null });
                            try {
                                const res = await fetch('/api/nfse/rotina', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data?.error ?? 'Erro na rotina');
                                setRotina({ running: false, result: data });
                                toast.success(data.summary);
                                fetchRecords();
                            } catch (e: any) {
                                setRotina({ running: false, result: null });
                                toast.error(e.message);
                            }
                        }}
                        disabled={rotina.running}
                        className="gap-2"
                    >
                        {rotina.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        {rotina.running ? 'Processando...' : 'Executar Rotina Agora'}
                    </Button>
                </CardContent>
            </Card>

            {/* Importar NFS-e do GINFES */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-primary" /> Importar NFS-e do GINFES
                    </CardTitle>
                    <CardDescription>
                        Busca notas emitidas diretamente no portal GINFES e as traz para o sistema.
                        Selecione o período de emissão e clique em Importar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="space-y-1.5 flex-1">
                            <Label className="text-xs">De</Label>
                            <Input
                                type="date"
                                value={importarPeriodo.de}
                                onChange={e => setImportarPeriodo(p => ({ ...p, de: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <Label className="text-xs">Até</Label>
                            <Input
                                type="date"
                                value={importarPeriodo.ate}
                                onChange={e => setImportarPeriodo(p => ({ ...p, ate: e.target.value }))}
                            />
                        </div>
                    </div>

                    {importar.result && (
                        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
                            <p className="font-semibold">{importar.result.summary ?? importar.result.message}</p>
                            {importar.result.detalhes?.length > 0 && (
                                <details className="mt-2">
                                    <summary className="text-xs text-muted-foreground cursor-pointer">
                                        Ver detalhes ({importar.result.detalhes.length})
                                    </summary>
                                    <div className="mt-2 space-y-0.5 max-h-48 overflow-y-auto">
                                        {importar.result.detalhes.map((d: any, i: number) => (
                                            <p key={i} className="text-xs font-mono">
                                                NFS-e {d.numeroNfse} / RPS {d.rps}: {d.resultado}
                                            </p>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                    )}

                    <Button
                        onClick={async () => {
                            if (!importarPeriodo.de || !importarPeriodo.ate) {
                                toast.error('Selecione o período de emissão.');
                                return;
                            }
                            setImportar({ running: true, result: null });
                            try {
                                const res = await fetch('/api/nfse/importar', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ dataInicial: importarPeriodo.de, dataFinal: importarPeriodo.ate }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data?.error ?? 'Erro na importação');
                                setImportar({ running: false, result: data });
                                toast.success(data.summary ?? data.message);
                                fetchRecords();
                            } catch (e: any) {
                                setImportar({ running: false, result: null });
                                toast.error(e.message);
                            }
                        }}
                        disabled={importar.running || !importarPeriodo.de || !importarPeriodo.ate}
                        className="gap-2"
                    >
                        {importar.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {importar.running ? 'Importando...' : 'Importar do GINFES'}
                    </Button>
                </CardContent>
            </Card>

            {/* Sincronizar NFS-e */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-primary" /> Sincronizar Notas Emitidas
                    </CardTitle>
                    <CardDescription>
                        Re-consulta o provedor GINFES por RPS e atualiza número da nota e código de verificação.
                        Filtre por período para sincronizar apenas as notas de um intervalo específico.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filtro de período de emissão */}
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="space-y-1.5 flex-1">
                            <Label className="text-xs">Emitida de</Label>
                            <Input
                                type="date"
                                value={syncPeriodo.de}
                                onChange={e => setSyncPeriodo(p => ({ ...p, de: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <Label className="text-xs">Emitida até</Label>
                            <Input
                                type="date"
                                value={syncPeriodo.ate}
                                onChange={e => setSyncPeriodo(p => ({ ...p, ate: e.target.value }))}
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() => setSyncPeriodo({ de: '', ate: '' })}
                            disabled={!syncPeriodo.de && !syncPeriodo.ate}
                        >
                            Limpar filtro
                        </Button>
                    </div>

                    {sync.result && (
                        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
                            <p className="font-semibold">{sync.result.summary}</p>
                            {sync.result.message && <p className="text-xs text-muted-foreground">{sync.result.message}</p>}
                            {sync.result.detalhes?.length > 0 && (
                                <details className="mt-2">
                                    <summary className="text-xs text-muted-foreground cursor-pointer">Ver detalhes ({sync.result.detalhes.length})</summary>
                                    <div className="mt-2 space-y-0.5 max-h-40 overflow-y-auto">
                                        {sync.result.detalhes.map((d: any) => (
                                            <p key={d.id} className="text-xs font-mono">RPS {d.rps}: {d.resultado}</p>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={async () => {
                                setSync(s => ({ ...s, running: true, forceAll: false, result: null }));
                                try {
                                    const body: any = { forceAll: false };
                                    if (syncPeriodo.de)  body.de  = syncPeriodo.de;
                                    if (syncPeriodo.ate) body.ate = syncPeriodo.ate;
                                    const res = await fetch('/api/nfse/sincronizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data?.error ?? 'Erro na sincronização');
                                    setSync(s => ({ ...s, running: false, result: data }));
                                    toast.success(data.summary ?? data.message);
                                    fetchRecords();
                                } catch (e: any) {
                                    setSync(s => ({ ...s, running: false, result: null }));
                                    toast.error(e.message);
                                }
                            }}
                            disabled={sync.running}
                            className="gap-2"
                        >
                            {sync.running && !sync.forceAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Sincronizar sem código de verificação
                        </Button>
                        <Button
                            onClick={async () => {
                                setSync(s => ({ ...s, running: true, forceAll: true, result: null }));
                                try {
                                    const body: any = { forceAll: true };
                                    if (syncPeriodo.de)  body.de  = syncPeriodo.de;
                                    if (syncPeriodo.ate) body.ate = syncPeriodo.ate;
                                    const res = await fetch('/api/nfse/sincronizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data?.error ?? 'Erro na sincronização');
                                    setSync(s => ({ ...s, running: false, result: data }));
                                    toast.success(data.summary ?? data.message);
                                    fetchRecords();
                                } catch (e: any) {
                                    setSync(s => ({ ...s, running: false, result: null }));
                                    toast.error(e.message);
                                }
                            }}
                            disabled={sync.running}
                            className="gap-2"
                        >
                            {sync.running && sync.forceAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Forçar sincronização completa (50 notas)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Histórico de NFS-e */}
            <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                    <div>
                        <CardTitle>Notas Fiscais Emitidas</CardTitle>
                        <CardDescription>Histórico de NFS-e processadas pelo sistema.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {records.some(r => ['pendente', 'erro'].includes(r.status)) && (
                            <Button
                                variant="outline" size="sm"
                                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={handleLimpar} disabled={limpando}
                            >
                                {limpando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                Limpar pendentes/erros
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => fetchRecords()} disabled={loadingRecords} className="gap-1.5">
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingRecords ? "animate-spin" : ""}`} />
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingRecords ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : records.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p>Nenhuma NFS-e emitida ainda.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/50 text-muted-foreground">
                                        <th className="text-left py-2 px-3 font-medium">RPS</th>
                                        <th className="text-left py-2 px-3 font-medium">NFS-e</th>
                                        <th className="text-left py-2 px-3 font-medium">Tomador</th>
                                        <th className="text-left py-2 px-3 font-medium">Valor</th>
                                        <th className="text-left py-2 px-3 font-medium">Status</th>
                                        <th className="text-left py-2 px-3 font-medium">Data</th>
                                        <th className="text-right py-2 px-3 font-medium">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map(r => {
                                        const st = STATUS_CFG[r.status] || { label: r.status, color: "bg-slate-100 text-slate-700" };
                                        return (
                                            <tr key={r.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-3 font-mono text-xs">{r.rpsNumero}</td>
                                                <td className="py-3 px-3 font-mono text-xs">{r.numeroNfse || "—"}</td>
                                                <td className="py-3 px-3">{r.tomadorNome || "—"}</td>
                                                <td className="py-3 px-3 font-medium">
                                                    {r.valorServicos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                                                </td>
                                                <td className="py-3 px-3 text-xs text-muted-foreground">
                                                    {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {["aguardando_processamento", "pendente"].includes(r.status) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs gap-1"
                                                                onClick={() => handleCheckStatus(r.id)}
                                                                disabled={checkingId === r.id}
                                                            >
                                                                {checkingId === r.id
                                                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                    : <RefreshCw className="h-3 w-3" />}
                                                                Verificar
                                                            </Button>
                                                        )}
                                                        {r.status === "emitida" && r.codigoVerificacao && (
                                                            <a
                                                                href={`https://guarulhos.ginfes.com.br/report/consultarNota?chave=${r.codigoVerificacao}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                                                    <ExternalLink className="h-3 w-3" />
                                                                    Ver NFS-e
                                                                </Button>
                                                            </a>
                                                        )}
                                                        {["erro", "pendente"].includes(r.status) && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700"
                                                                    onClick={() => handleRetry(r.id)}
                                                                    disabled={retryingId === r.id}
                                                                >
                                                                    {retryingId === r.id
                                                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                        : <RotateCcw className="h-3 w-3" />}
                                                                    Retentar
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 text-xs gap-1 text-red-600 hover:text-red-700"
                                                                    onClick={() => handleDelete(r.id)}
                                                                    disabled={deletingId === r.id}
                                                                >
                                                                    {deletingId === r.id
                                                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                        : <XCircle className="h-3 w-3" />}
                                                                    Excluir
                                                                </Button>
                                                            </>
                                                        )}
                                                        {(r.xmlEnviado || r.xmlRetorno || r.errorMessage) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs gap-1"
                                                                onClick={() => {
                                                                    setXmlModal({ open: true, enviado: r.xmlEnviado || "", retorno: r.xmlRetorno || "", erro: r.errorMessage || "" });
                                                                    setXmlTab(r.errorMessage ? "erro" : r.xmlRetorno ? "retorno" : "enviado");
                                                                }}
                                                            >
                                                                <Code2 className="h-3 w-3" />
                                                                XML
                                                            </Button>
                                                        )}
                                                        {r.status === "emitida" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs text-red-600 hover:text-red-700 gap-1"
                                                                onClick={() => handleCancel(r.id)}
                                                            >
                                                                <XCircle className="h-3 w-3" />
                                                                Cancelar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginação */}
                    {recordPagination && recordPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-border/40">
                            <p className="text-xs text-muted-foreground">
                                {recordPagination.total} registros · página {recordPage} de {recordPagination.totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline" size="sm"
                                    disabled={recordPage <= 1 || loadingRecords}
                                    onClick={() => { const p = recordPage - 1; setRecordPage(p); fetchRecords(p); }}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline" size="sm"
                                    disabled={recordPage >= recordPagination.totalPages || loadingRecords}
                                    onClick={() => { const p = recordPage + 1; setRecordPage(p); fetchRecords(p); }}
                                >
                                    Próxima
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal Tipo de Serviço */}
            {tipoModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-lg rounded-2xl border shadow-2xl">
                        <div className="p-5 border-b flex items-center justify-between">
                            <h2 className="font-bold">{tipoModal.editing ? "Editar Modelo" : "Novo Modelo de Serviço"}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setTipoModal({ open: false, editing: null })}><XCircle className="h-4 w-4" /></Button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1">
                                <Label className="text-xs">Nome do Modelo *</Label>
                                <Input placeholder="ex: Manutenção em TI" value={tipoForm.nome} onChange={e => setTipoForm(f => ({ ...f, nome: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Item da Lista de Serviço *</Label>
                                    <Input placeholder="ex: 1.07" value={tipoForm.itemListaServico} onChange={e => setTipoForm(f => ({ ...f, itemListaServico: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Alíquota ISS (%) *</Label>
                                    <Input type="number" step="0.01" placeholder="ex: 2.15" value={tipoForm.aliquotaIss} onChange={e => setTipoForm(f => ({ ...f, aliquotaIss: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">ISS Retido</Label>
                                    <Select value={tipoForm.issRetido} onValueChange={v => setTipoForm(f => ({ ...f, issRetido: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2">Não Retido</SelectItem>
                                            <SelectItem value="1">Retido na Fonte</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Natureza da Operação</Label>
                                    <Select value={tipoForm.naturezaOperacao} onValueChange={v => setTipoForm(f => ({ ...f, naturezaOperacao: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 - Tributação no Município</SelectItem>
                                            <SelectItem value="2">2 - Tributação Fora do Município</SelectItem>
                                            <SelectItem value="3">3 - Isenção</SelectItem>
                                            <SelectItem value="4">4 - Imune</SelectItem>
                                            <SelectItem value="5">5 - Exigibilidade Suspensa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Discriminação padrão (opcional)</Label>
                                <Input placeholder="Texto que será pré-preenchido na emissão" value={tipoForm.discriminacaoModelo} onChange={e => setTipoForm(f => ({ ...f, discriminacaoModelo: e.target.value }))} />
                            </div>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={tipoForm.isDefault} onChange={e => setTipoForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
                                Definir como modelo padrão
                            </label>
                        </div>
                        <div className="p-5 border-t flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setTipoModal({ open: false, editing: null })}>Cancelar</Button>
                            <Button onClick={handleSaveTipo} disabled={savingTipo} className="gap-2">
                                {savingTipo && <Loader2 className="h-4 w-4 animate-spin" />}
                                {tipoModal.editing ? "Salvar" : "Criar Modelo"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal XML Viewer */}
            {xmlModal?.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-background w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b flex items-center justify-between shrink-0">
                            <h2 className="font-bold flex items-center gap-2"><Code2 className="h-4 w-4 text-primary" /> Visualizador XML</h2>
                            <Button variant="ghost" size="icon" onClick={() => setXmlModal(null)}><XCircle className="h-4 w-4" /></Button>
                        </div>
                        <div className="flex gap-1 px-4 pt-3 shrink-0">
                            {xmlModal.retorno && (
                                <button onClick={() => setXmlTab("retorno")}
                                    className={`px-3 py-1 rounded-t text-xs font-medium border-b-2 transition-colors ${xmlTab === "retorno" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                                    Retorno Ginfes
                                </button>
                            )}
                            {xmlModal.enviado && (
                                <button onClick={() => setXmlTab("enviado")}
                                    className={`px-3 py-1 rounded-t text-xs font-medium border-b-2 transition-colors ${xmlTab === "enviado" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                                    XML Enviado
                                </button>
                            )}
                            {xmlModal.erro && (
                                <button onClick={() => setXmlTab("erro")}
                                    className={`px-3 py-1 rounded-t text-xs font-medium border-b-2 transition-colors ${xmlTab === "erro" ? "border-orange-500 text-orange-500" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                                    Mensagem de Erro
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <pre className="text-xs bg-muted/50 rounded-lg p-4 overflow-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                                {xmlTab === "retorno" ? xmlModal.retorno : xmlTab === "enviado" ? xmlModal.enviado : xmlModal.erro}
                            </pre>
                        </div>
                        <div className="p-4 border-t shrink-0 flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                                const text = xmlTab === "retorno" ? xmlModal.retorno : xmlTab === "enviado" ? xmlModal.enviado : xmlModal.erro;
                                copyToClipboard(text);
                                toast.success("Copiado!");
                            }}>Copiar</Button>
                            <Button variant="ghost" size="sm" onClick={() => setXmlModal(null)}>Fechar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
