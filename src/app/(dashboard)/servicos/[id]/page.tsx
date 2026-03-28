"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Copy, Mail, KeyRound, CheckCircle2, XCircle,
  PauseCircle, Clock, RefreshCw, ExternalLink, Loader2, FileText, Plus
} from "lucide-react";
import { toast } from "sonner";

const STATUS_SERVICE: Record<string, { label: string; variant: any; color: string }> = {
  rascunho:     { label: "Rascunho",     variant: "secondary", color: "text-slate-400" },
  enviado:      { label: "Enviado",      variant: "outline",   color: "text-blue-400" },
  aprovado:     { label: "Aprovado",     variant: "default",   color: "text-emerald-400" },
  em_andamento: { label: "Em Andamento", variant: "default",   color: "text-emerald-400" },
  concluido:    { label: "Concluído",    variant: "secondary", color: "text-slate-400" },
  cancelado:    { label: "Cancelado",    variant: "destructive", color: "text-red-400" },
  suspenso:     { label: "Suspenso",     variant: "outline",   color: "text-amber-400" },
};

const STATUS_LICENSE: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  active:    { label: "Ativa",     icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  trial:     { label: "Teste",     icon: Clock,        color: "text-blue-400",    bg: "bg-blue-500/10" },
  suspended: { label: "Suspensa",  icon: PauseCircle,  color: "text-amber-400",   bg: "bg-amber-500/10" },
  blocked:   { label: "Bloqueada", icon: XCircle,      color: "text-red-400",     bg: "bg-red-500/10" },
};

const NFSE_STATUS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-slate-100 text-slate-700" },
  aguardando_processamento: { label: "Aguardando", color: "bg-blue-100 text-blue-700" },
  emitida: { label: "Emitida", color: "bg-green-100 text-green-700" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700" },
  erro: { label: "Erro", color: "bg-orange-100 text-orange-700" },
};

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [service, setService] = useState<any>(null);
  const [license, setLicense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  // NFS-e
  const [nfseRecords, setNfseRecords] = useState<any[]>([]);
  const [nfseModal, setNfseModal] = useState(false);
  const [editingNfseId, setEditingNfseId] = useState<string | null>(null); // id da nota sendo editada p/ retry
  const [emitindo, setEmitindo] = useState(false);
  const [checkingNfse, setCheckingNfse] = useState<string | null>(null);
  const [retryingNfse, setRetryingNfse] = useState<string | null>(null);
  const [nfseForm, setNfseForm] = useState({
    discriminacao: "",
    valorServicos: "",
    tomadorNome: "",
    tomadorDoc: "",
    tomadorEmail: "",
    tomadorEndereco: "",
    tomadorNumero: "",
    tomadorBairro: "",
    tomadorCodigoMunicipio: "3514700",
    tomadorUf: "SP",
    tomadorCep: "",
  });

  const fetchNfse = async (svcId: string) => {
    try {
      const res = await fetch(`/api/nfse?serviceId=${svcId}`);
      if (res.ok) setNfseRecords(await res.json());
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/servicos/${id}`).then(r => r.json()),
      fetch(`/api/servicos/${id}/license`).then(r => r.json()),
    ]).then(([svc, lic]) => {
      setService(svc);
      setLicense(lic);
      if (lic?.customerEmail) setEmailInput(lic.customerEmail);
      // Pré-preencher form NFS-e
      setNfseForm(prev => ({
        ...prev,
        discriminacao: svc.description || svc.title || "",
        valorServicos: String(svc.amount || ""),
        tomadorNome: svc.client?.name || "",
        tomadorDoc: svc.client?.document || "",
        tomadorEmail: svc.client?.email || "",
        tomadorEndereco: svc.client?.address || "",
        tomadorNumero: svc.client?.number || "",
        tomadorBairro: svc.client?.neighborhood || "",
        tomadorUf: svc.client?.state || "SP",
        tomadorCep: (svc.client?.zipCode || "").replace(/\D/g, ""),
      }));
      fetchNfse(id);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleEmitirNfse = async (e: React.FormEvent) => {
    e.preventDefault();
    // Se está editando uma nota existente, chama retry
    if (editingNfseId) {
      await handleRetryNfse(editingNfseId);
      return;
    }
    setEmitindo(true);
    try {
      const res = await fetch("/api/nfse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nfseForm, serviceId: id, clientId: service?.clientId, valorServicos: parseFloat(nfseForm.valorServicos) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao emitir");
      toast.success(data.protocolo ? `Lote enviado! Protocolo: ${data.protocolo}` : "NFS-e enviada para processamento!");
      setNfseModal(false);
      fetchNfse(id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmitindo(false);
    }
  };

  const openRetryModal = (record: any) => {
    setEditingNfseId(record.id);
    setNfseForm({
      discriminacao: record.discriminacao || "",
      valorServicos: String(record.valorServicos || ""),
      tomadorNome: record.tomadorNome || "",
      tomadorDoc: record.tomadorDoc || "",
      tomadorEmail: "",
      tomadorEndereco: "",
      tomadorNumero: "",
      tomadorBairro: "",
      tomadorCodigoMunicipio: "3514700",
      tomadorUf: "SP",
      tomadorCep: "",
    });
    setNfseModal(true);
  };

  const handleRetryNfse = async (nfseId: string) => {
    setRetryingNfse(nfseId);
    try {
      const res = await fetch(`/api/nfse/${nfseId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nfseForm, valorServicos: parseFloat(nfseForm.valorServicos) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao reenviar");
      toast.success(data.protocolo ? `Reenviado! Protocolo: ${data.protocolo}` : "NFS-e reenviada para processamento!");
      setNfseModal(false);
      setEditingNfseId(null);
      fetchNfse(id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRetryingNfse(null);
    }
  };

  const handleCheckNfse = async (nfseId: string) => {
    setCheckingNfse(nfseId);
    try {
      const res = await fetch(`/api/nfse/${nfseId}`);
      const data = await res.json();
      if (data.status === "emitida") toast.success(`NFS-e emitida! Número: ${data.numeroNfse}`);
      else toast.info(`Status: ${NFSE_STATUS[data.status]?.label || data.status}`);
      fetchNfse(id);
    } catch { toast.error("Erro ao consultar"); }
    finally { setCheckingNfse(null); }
  };

  const copyKey = () => {
    if (!license?.key) return;
    navigator.clipboard.writeText(license.key);
    setCopied(true);
    toast.success("Chave copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const sendEmail = async () => {
    if (!emailInput) return toast.error("Informe o email do destinatário");
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/servicos/${id}/license/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      if (res.ok) toast.success("Email enviado com sucesso!");
      else {
        const err = await res.json();
        toast.error(err.error || "Erro ao enviar email");
      }
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Serviço não encontrado.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const svcStatus = STATUS_SERVICE[service.status] ?? { label: service.status, variant: "secondary", color: "text-slate-400" };
  const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "—";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{service.title}</h1>
          <p className="text-sm text-muted-foreground">{service.client?.name ?? "Sem cliente"}</p>
        </div>
        <Badge variant={svcStatus.variant}>{svcStatus.label}</Badge>
      </div>

      {/* Dados do Serviço */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalhes do Serviço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Valor</p>
            <p className="font-medium">{fmt(Number(service.amount))}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cobrança</p>
            <p className="font-medium capitalize">{service.billingFrequency ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Categoria</p>
            <p className="font-medium">{service.category ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vencimento</p>
            <p className="font-medium">
              {service.dueDate ? new Date(service.dueDate).toLocaleDateString("pt-BR") : "—"}
            </p>
          </div>
          {service.description && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Descrição</p>
              <p>{service.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Licença de Plugin */}
      {license ? (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Licença do Plugin Grafana
              </CardTitle>
              {(() => {
                const s = STATUS_LICENSE[license.status] ?? STATUS_LICENSE.active;
                const Icon = s.icon;
                return (
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.bg} ${s.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </span>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Chave */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Chave de Licença</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-sm bg-muted/50 rounded-lg px-4 py-3 border border-border/50 tracking-widest select-all">
                  {license.key}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyKey}
                  className={copied ? "text-emerald-500 border-emerald-500/30" : ""}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Informações */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-medium">{license.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Emitida em</p>
                <p className="font-medium">{new Date(license.issuedAt).toLocaleDateString("pt-BR")}</p>
              </div>
              {license.isTrial && license.trialEndsAt && (
                <div>
                  <p className="text-muted-foreground text-xs">Período de Teste até</p>
                  <p className="font-medium text-blue-400">{new Date(license.trialEndsAt).toLocaleDateString("pt-BR")}</p>
                </div>
              )}
              {license.lastValidAt && (
                <div>
                  <p className="text-muted-foreground text-xs">Última Validação</p>
                  <p className="font-medium">{new Date(license.lastValidAt).toLocaleDateString("pt-BR")}</p>
                </div>
              )}
              {license.lastIp && (
                <div>
                  <p className="text-muted-foreground text-xs">Último IP</p>
                  <p className="font-medium font-mono text-xs">{license.lastIp}</p>
                </div>
              )}
            </div>

            {/* Enviar por email */}
            {license.status !== "blocked" && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Enviar Chave por Email</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@cliente.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={sendEmail} disabled={sendingEmail} className="gap-2">
                    {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Enviar
                  </Button>
                </div>
              </div>
            )}

            {license.status === "blocked" && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span>Esta licença foi <strong>bloqueada permanentemente</strong>. O plugin está desativado para este cliente.</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : service.category === "Plugin Grafana" ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex items-center gap-3 py-5 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Licença ainda não gerada para este serviço.</span>
          </CardContent>
        </Card>
      ) : null}

      {/* NFS-e */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Nota Fiscal de Serviço (NFS-e)
            </CardTitle>
            <Button size="sm" className="gap-1.5" onClick={() => setNfseModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Emitir NFS-e
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {nfseRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma NFS-e emitida para este serviço.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-2 px-2 font-medium">RPS</th>
                  <th className="text-left py-2 px-2 font-medium">NFS-e</th>
                  <th className="text-left py-2 px-2 font-medium">Valor</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-right py-2 px-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {nfseRecords.map(r => {
                  const st = NFSE_STATUS[r.status] || { label: r.status, color: "bg-slate-100 text-slate-700" };
                  return (
                    <tr key={r.id} className="border-b border-border/40">
                      <td className="py-2 px-2 font-mono text-xs">{r.rpsNumero}</td>
                      <td className="py-2 px-2 font-mono text-xs">{r.numeroNfse || "—"}</td>
                      <td className="py-2 px-2">
                        {r.valorServicos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-col gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${st.color}`}>{st.label}</span>
                          {r.errorMessage && (
                            <span className="text-xs text-red-500 max-w-[160px] truncate" title={r.errorMessage}>{r.errorMessage}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right space-x-1">
                        {r.status === "aguardando_processamento" && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => handleCheckNfse(r.id)} disabled={checkingNfse === r.id}
                          >
                            {checkingNfse === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Verificar
                          </Button>
                        )}
                        {["erro", "pendente"].includes(r.status) && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700"
                            onClick={() => openRetryModal(r)}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Editar e Retentar
                          </Button>
                        )}
                        {r.status === "emitida" && r.codigoVerificacao && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-blue-600"
                            onClick={() => window.open(`https://guarulhos.ginfes.com.br/report/consultarNota?chave=${r.codigoVerificacao}`, "_blank")}>
                            <ExternalLink className="h-3 w-3" />
                            Ver NFS-e
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal Emitir NFS-e */}
      {nfseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b shrink-0">
              <h2 className="text-lg font-bold">{editingNfseId ? "Corrigir e Reenviar NFS-e" : "Emitir NFS-e"}</h2>
              <p className="text-sm text-muted-foreground">
                {editingNfseId
                  ? "Corrija os dados abaixo e clique em Reenviar."
                  : "Os dados foram pré-preenchidos com as informações do serviço e cliente."}
              </p>
            </div>
            <form onSubmit={handleEmitirNfse} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Discriminação do Serviço *</Label>
                  <Textarea
                    required
                    rows={3}
                    value={nfseForm.discriminacao}
                    onChange={e => setNfseForm({ ...nfseForm, discriminacao: e.target.value })}
                    placeholder="Descrição detalhada do serviço prestado"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor dos Serviços (R$) *</Label>
                  <Input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={nfseForm.valorServicos}
                    onChange={e => setNfseForm({ ...nfseForm, valorServicos: e.target.value })}
                  />
                </div>

                <div className="border-t border-border/50 pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dados do Tomador</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label className="text-xs">Nome / Razão Social</Label>
                      <Input value={nfseForm.tomadorNome} onChange={e => setNfseForm({ ...nfseForm, tomadorNome: e.target.value })} placeholder="Nome do tomador" />
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label className="text-xs">CPF / CNPJ</Label>
                      <Input value={nfseForm.tomadorDoc} onChange={e => setNfseForm({ ...nfseForm, tomadorDoc: e.target.value })} placeholder="Somente números" />
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={nfseForm.tomadorEmail} onChange={e => setNfseForm({ ...nfseForm, tomadorEmail: e.target.value })} />
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label className="text-xs">CEP</Label>
                      <Input value={nfseForm.tomadorCep} onChange={e => setNfseForm({ ...nfseForm, tomadorCep: e.target.value })} placeholder="00000000" maxLength={8} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Endereço</Label>
                      <Input value={nfseForm.tomadorEndereco} onChange={e => setNfseForm({ ...nfseForm, tomadorEndereco: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Número</Label>
                      <Input value={nfseForm.tomadorNumero} onChange={e => setNfseForm({ ...nfseForm, tomadorNumero: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bairro</Label>
                      <Input value={nfseForm.tomadorBairro} onChange={e => setNfseForm({ ...nfseForm, tomadorBairro: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cód. Município (IBGE)</Label>
                      <Input value={nfseForm.tomadorCodigoMunicipio} onChange={e => setNfseForm({ ...nfseForm, tomadorCodigoMunicipio: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">UF</Label>
                      <Input value={nfseForm.tomadorUf} onChange={e => setNfseForm({ ...nfseForm, tomadorUf: e.target.value })} maxLength={2} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 shrink-0">
                <Button type="button" variant="ghost" onClick={() => { setNfseModal(false); setEditingNfseId(null); }}>Cancelar</Button>
                <Button type="submit" disabled={emitindo || retryingNfse !== null} className="gap-2">
                  {(emitindo || retryingNfse !== null) && <Loader2 className="h-4 w-4 animate-spin" />}
                  <FileText className="h-4 w-4" />
                  {editingNfseId ? "Reenviar NFS-e" : "Emitir NFS-e"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voltar para lista */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => router.push("/servicos")} className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Ver todos os serviços
        </Button>
      </div>
    </div>
  );
}
