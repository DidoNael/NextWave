"use client";

import { useState, useEffect, useRef } from "react";
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
    RotateCcw, Code2, ExternalLink
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

export default function NfeConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [records, setRecords] = useState<NfseRecord[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [retryingId, setRetryingId] = useState<string | null>(null);
    const [xmlModal, setXmlModal] = useState<{ open: boolean; enviado: string; retorno: string; erro: string } | null>(null);
    const [xmlTab, setXmlTab] = useState<"enviado" | "retorno" | "erro">("retorno");
    const fileRef = useRef<HTMLInputElement>(null);

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
        optanteSimplesNacional: "1",
        // upload
        certificadoBase64: "",
        senhaCertificado: "",
        certFileName: "",
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
                    optanteSimplesNacional: data.optanteSimplesNacional || "1",
                }));
            }
        } catch {
            toast.error("Erro ao carregar configuração");
        } finally {
            setLoading(false);
        }
    };

    const fetchRecords = async () => {
        setLoadingRecords(true);
        try {
            const res = await fetch("/api/nfse");
            if (res.ok) setRecords(await res.json());
        } catch { /* silencioso */ } finally {
            setLoadingRecords(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchRecords();
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
            const payload = {
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
                ...(form.certificadoBase64 ? { certificadoBase64: form.certificadoBase64 } : {}),
                ...(form.senhaCertificado ? { senhaCertificado: form.senhaCertificado } : {}),
            };

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
            setForm(prev => ({ ...prev, certificadoBase64: "", senhaCertificado: "", certFileName: "", hasCertificado: true }));
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
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight">NFS-e / Notas Fiscais</h1>
                <p className="text-muted-foreground text-sm">
                    Configure a integração com o sistema Ginfes de Guarulhos para emissão de Notas Fiscais de Serviço.
                </p>
            </div>

            {form.ambiente === "homologacao" && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Modo <strong>Homologação</strong> ativo — as notas emitidas são de teste e não têm validade fiscal.</span>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
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

                {/* Certificado Digital */}
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
                    </CardContent>
                </Card>

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

            {/* Histórico de NFS-e */}
            <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                    <div>
                        <CardTitle>Notas Fiscais Emitidas</CardTitle>
                        <CardDescription>Histórico de NFS-e processadas pelo sistema.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loadingRecords} className="gap-1.5">
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingRecords ? "animate-spin" : ""}`} />
                        Atualizar
                    </Button>
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
                </CardContent>
            </Card>

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
                                navigator.clipboard.writeText(text);
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
