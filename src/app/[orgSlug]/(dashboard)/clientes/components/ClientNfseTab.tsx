"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Plus, RefreshCw, XCircle, Loader2, CheckCircle2, Clock, AlertTriangle, Receipt, Code2, Copy, Check, Printer, Mail, MessageCircle, Download, History, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClientNfseTabProps {
  clientId: string;
  client: any;
  services: any[];
  onRefresh?: () => void;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function NfseBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pendente: { label: "Pendente", cls: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", icon: <Clock className="h-3 w-3" /> },
    aguardando_processamento: { label: "Aguardando", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    emitida: { label: "Emitida", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
    cancelada: { label: "Cancelada", cls: "bg-slate-500/15 text-slate-600 border-slate-500/30", icon: <XCircle className="h-3 w-3" /> },
    erro: { label: "Erro", cls: "bg-red-500/15 text-red-600 border-red-500/30", icon: <AlertTriangle className="h-3 w-3" /> },
  };
  const s = map[status] ?? map.pendente;
  return (
    <Badge className={cn("gap-1 text-[10px] border", s.cls)}>
      {s.icon}{s.label}
    </Badge>
  );
}

export function ClientNfseTab({ clientId, client, services, onRefresh }: ClientNfseTabProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emitOpen, setEmitOpen] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);
  const [xmlView, setXmlView] = useState<{ enviado?: string; retorno?: string } | null>(null);
  const [logView, setLogView] = useState<{ nfseId: string; logs: any[] } | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  // Mês atual no formato YYYY-MM para data de competência
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [form, setForm] = useState({
    serviceId: "",
    discriminacao: "",
    valorServicos: "",
    dataCompetencia: currentMonth,
    tomadorNome: "",
    tomadorDoc: "",
    tomadorEmail: "",
    tomadorEndereco: "",
    tomadorNumero: "",
    tomadorBairro: "",
    tomadorCodigoMunicipio: "",
    tomadorUf: "",
    tomadorCep: "",
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nfse?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : (data.records ?? []));
      }
    } catch {
      toast.error("Erro ao carregar registros NFS-e");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Polling automático enquanto houver notas em aguardando_processamento
  useEffect(() => {
    const hasAguardando = records.some(r => r.status === "aguardando_processamento");
    if (!hasAguardando) return;

    const interval = setInterval(async () => {
      // Consulta cada nota aguardando individualmente — isso atualiza o status via GET /api/nfse/[id]
      const aguardando = records.filter(r => r.status === "aguardando_processamento");
      let updated = false;
      for (const rec of aguardando) {
        try {
          const res = await fetch(`/api/nfse/${rec.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status !== rec.status) updated = true;
          }
        } catch { /* ignora */ }
      }
      if (updated) fetchRecords();
    }, 10_000); // a cada 10 segundos

    return () => clearInterval(interval);
  }, [records, fetchRecords]);

  // Serviços elegíveis: não cancelados e ainda sem NFS-e emitida/aguardando
  const emittedServiceIds = new Set(
    records.filter(r => ["emitida", "aguardando_processamento", "pendente"].includes(r.status)).map(r => r.serviceId)
  );
  const eligibleServices = services.filter(s => s.status !== "cancelado" && !emittedServiceIds.has(s.id));

  function openEmit(svc?: any) {
    setForm({
      serviceId:              svc?.id ?? "",
      discriminacao:          svc ? `${svc.title}${svc.description ? " — " + svc.description : ""}` : "",
      valorServicos:          svc ? String(svc.amount) : "",
      dataCompetencia:        currentMonth,
      tomadorNome:            client?.name ?? "",
      tomadorDoc:             (client?.document ?? "").replace(/\D/g, ""),
      tomadorEmail:           client?.email ?? "",
      tomadorEndereco:        client?.address ?? "",
      tomadorNumero:          client?.number ?? "",
      tomadorBairro:          client?.neighborhood ?? "",
      tomadorCodigoMunicipio: (client as any)?.cityCode ?? "",
      tomadorUf:              client?.state ?? "",
      tomadorCep:             (client?.zipCode ?? "").replace(/\D/g, ""),
    });
    setEmitOpen(true);
  }

  async function handleEmit() {
    if (!form.discriminacao || !form.valorServicos) {
      toast.error("Discriminação e valor são obrigatórios");
      return;
    }
    setEmitting(true);
    try {
      const res = await fetch("/api/nfse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, clientId, valorServicos: parseFloat(form.valorServicos) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao emitir NFS-e");
      toast.success("NFS-e enviada para processamento!");
      setEmitOpen(false);
      fetchRecords();
      onRefresh?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEmitting(false);
    }
  }

  async function handleRetry(id: string) {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/nfse/${id}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao reenviar");
      toast.success("NFS-e reenviada para processamento!");
      fetchRecords();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRetryingId(null);
    }
  }

  async function handleCancel(id: string, status: string) {
    setCancellingId(id);
    try {
      if (status === "emitida") {
        // Cancela no GINFES e marca como cancelada no banco
        const res = await fetch(`/api/nfse/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Erro ao cancelar NFS-e no GINFES");
        toast.success("NFS-e cancelada no GINFES.");
      } else {
        // Só remove o registro local (pendente / aguardando / erro)
        const res = await fetch(`/api/nfse/${id}/excluir`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Erro ao excluir registro");
        toast.success("Registro excluído.");
      }
      fetchRecords();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSendEmail(id: string) {
    setSendingEmailId(id);
    try {
      const res = await fetch(`/api/nfse/${id}/send-email`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Erro ao enviar e-mail");
      }
      toast.success("E-mail enviado com sucesso!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingEmailId(null);
    }
  }

  async function handleSendWa(id: string) {
    setSendingWaId(id);
    try {
      const res = await fetch(`/api/nfse/${id}/send-whatsapp`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Erro ao enviar WhatsApp");
      }
      toast.success("Mensagem de WhatsApp enviada!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingWaId(null);
    }
  }

  async function handleViewLogs(id: string) {
    setLoadingLogs(true);
    setLogView({ nfseId: id, logs: [] });
    try {
      const res = await fetch(`/api/nfse/${id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogView({ nfseId: id, logs: data });
      }
    } catch {
      toast.error("Erro ao carregar logs");
    } finally {
      setLoadingLogs(false);
    }
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Notas Fiscais de Serviço</p>
          <p className="text-xs text-muted-foreground">{records.length} registro{records.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" className="gap-2 rounded-xl" onClick={() => openEmit()}>
          <Plus className="h-3.5 w-3.5" /> Emitir NFS-e
        </Button>
      </div>

      {/* Serviços sem NFS-e */}
      {eligibleServices.length > 0 && (
        <div className="rounded-xl border border-dashed border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Serviços sem NFS-e emitida
          </p>
          <div className="flex flex-wrap gap-2">
            {eligibleServices.map(svc => (
              <button
                key={svc.id}
                onClick={() => openEmit(svc)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-border text-xs hover:border-primary hover:text-primary transition-colors"
              >
                <FileText className="h-3 w-3" />
                {svc.title}
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold">{formatCurrency(svc.amount)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de NFS-e */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Nenhuma NFS-e emitida para este cliente</p>
          <p className="text-xs mt-1">Clique em "Emitir NFS-e" ou selecione um serviço acima</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(rec => (
            <div key={rec.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/60 bg-white dark:bg-slate-900 hover:border-border transition-colors">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <NfseBadge status={rec.status} />
                  {rec.ambiente === "producao" && (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/30">Produção</Badge>
                  )}
                  {rec.ambiente === "homologacao" && (
                    <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-500 border-orange-500/30">Homologação</Badge>
                  )}
                  {rec.numeroNfse && (
                    <span className="text-xs font-mono text-muted-foreground">NFS-e #{rec.numeroNfse}</span>
                  )}
                  <span className="text-xs font-mono text-muted-foreground">RPS {rec.rpsSerie}/{rec.rpsNumero}</span>
                  <span className="text-xs font-semibold text-foreground">{formatCurrency(rec.valorServicos)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{rec.discriminacao}</p>
                {rec.errorMessage && (
                  <p className="text-[10px] text-red-500 bg-red-50 dark:bg-red-950/30 rounded px-2 py-0.5">{rec.errorMessage}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(rec.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {rec.status === "emitida" && (
                  <>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-600"
                      disabled={sendingEmailId === rec.id}
                      onClick={() => handleSendEmail(rec.id)}
                      title="Enviar por E-mail"
                    >
                      {sendingEmailId === rec.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Mail className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-600"
                      disabled={sendingWaId === rec.id}
                      onClick={() => handleSendWa(rec.id)}
                      title="Enviar por WhatsApp"
                    >
                      {sendingWaId === rec.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <MessageCircle className="h-3.5 w-3.5" />}
                    </Button>
                  </>
                )}
                {rec.status === "emitida" && (
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                    onClick={() => {
                      window.open(`/api/nfse/${rec.id}/pdf`, "_blank");
                    }}
                    title="Ver PDF"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
                {rec.xmlRetorno && (
                  <>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => {
                          const blob = new Blob([rec.xmlRetorno || ''], { type: 'text/xml' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `NFSe-${rec.numeroNfse}.xml`;
                          a.click();
                      }}
                      title="Baixar XML"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100"
                      onClick={() => setXmlView({ retorno: rec.xmlRetorno })}
                      title="Ver Dados XML"
                    >
                      <Code2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {(rec.status === "erro" || rec.status === "pendente") && (
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-600"
                    disabled={retryingId === rec.id}
                    onClick={() => handleRetry(rec.id)}
                    title="Reenviar"
                  >
                    {retryingId === rec.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />}
                  </Button>
                )}
                {rec.status !== "cancelada" && rec.status !== "erro" && (
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={cancellingId === rec.id}
                    onClick={() => handleCancel(rec.id, rec.status)}
                    title={rec.status === "emitida" ? "Cancelar NFS-e no GINFES" : "Excluir registro"}
                  >
                    {cancellingId === rec.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <XCircle className="h-3.5 w-3.5" />}
                  </Button>
                )}
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600"
                  onClick={() => handleViewLogs(rec.id)}
                  title="Histórico / Logs"
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Ver Logs */}
      <Dialog open={!!logView} onOpenChange={(o) => !o && setLogView(null)}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Histórico de Ações
            </DialogTitle>
            <DialogDescription>Eventos registrados para esta NFS-e</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
            {loadingLogs ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : logView?.logs.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">Nenhum evento registrado.</div>
            ) : (
              <div className="space-y-4">
                {logView?.logs.map((log: any) => (
                  <div key={log.id} className="relative pl-6 pb-1 border-l-2 border-border last:border-0 ml-2">
                    <div className={cn(
                      "absolute -left-2 top-0 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center",
                      log.status === 'sucesso' ? 'bg-emerald-500' : 'bg-red-500'
                    )}>
                      {log.status === 'sucesso' ? <CheckCircle2 className="h-2 w-2 text-white" /> : <XCircle className="h-2 w-2 text-white" />}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{log.type}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-xs font-semibold">{log.message}</p>
                      {log.details && (
                        <p className="text-[10px] text-muted-foreground bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded mt-1 border border-border/40 font-mono italic">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver XML */}
      <Dialog open={!!xmlView} onOpenChange={(o) => !o && setXmlView(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" /> XML da NFS-e
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {xmlView?.enviado && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">XML Enviado</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => copyToClipboard(xmlView.enviado!, 'enviado')}
                  >
                    {copiedKey === 'enviado'
                      ? <><Check className="h-3.5 w-3.5 mr-1 text-green-500" /> Copiado</>
                      : <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</>}
                  </Button>
                </div>
                <pre className="text-[10px] bg-slate-950 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {xmlView.enviado}
                </pre>
              </div>
            )}
            {xmlView?.retorno && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Retorno GINFES</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => copyToClipboard(xmlView.retorno!, 'retorno')}
                  >
                    {copiedKey === 'retorno'
                      ? <><Check className="h-3.5 w-3.5 mr-1 text-green-500" /> Copiado</>
                      : <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</>}
                  </Button>
                </div>
                <pre className="text-[10px] bg-slate-950 text-blue-300 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {xmlView.retorno}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Emitir NFS-e */}
      <Dialog open={emitOpen} onOpenChange={setEmitOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Emitir NFS-e
            </DialogTitle>
            <DialogDescription>
              Preencha os dados para emissão da Nota Fiscal de Serviço Eletrônica.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Serviço vinculado */}
            {eligibleServices.length > 0 && (
              <div className="col-span-2 space-y-1.5">
                <Label>Serviço <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Select value={form.serviceId || "__none__"} onValueChange={v => {
                  const svc = services.find(s => s.id === v);
                  if (svc) {
                    f("serviceId", v);
                    f("discriminacao", `${svc.title}${svc.description ? " — " + svc.description : ""}`);
                    f("valorServicos", String(svc.amount));
                  } else {
                    f("serviceId", "");
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione um serviço (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem vínculo de serviço</SelectItem>
                    {eligibleServices.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title} — {formatCurrency(s.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Discriminação */}
            <div className="col-span-2 space-y-1.5">
              <Label>Discriminação do Serviço <span className="text-destructive">*</span></Label>
              <Textarea
                rows={3}
                placeholder="Descrição do serviço prestado..."
                value={form.discriminacao}
                onChange={e => f("discriminacao", e.target.value)}
              />
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <Label>Valor dos Serviços (R$) <span className="text-destructive">*</span></Label>
              <Input
                type="number" step="0.01" min="0"
                placeholder="0,00"
                value={form.valorServicos}
                onChange={e => f("valorServicos", e.target.value)}
              />
            </div>

            {/* Data de Competência */}
            <div className="space-y-1.5">
              <Label>Competência <span className="text-destructive">*</span></Label>
              <Input
                type="month"
                value={form.dataCompetencia}
                onChange={e => f("dataCompetencia", e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Mês de referência da prestação do serviço</p>
            </div>

            <div className="space-y-1.5">
              <Label>E-mail do Tomador</Label>
              <Input placeholder="email@cliente.com" value={form.tomadorEmail} onChange={e => f("tomadorEmail", e.target.value)} />
            </div>

            {/* Tomador */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados do Tomador</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome / Razão Social</Label>
                  <Input placeholder="Nome completo" value={form.tomadorNome} onChange={e => f("tomadorNome", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF / CNPJ</Label>
                  <Input placeholder="Somente números" value={form.tomadorDoc} onChange={e => f("tomadorDoc", e.target.value.replace(/\D/g, ""))} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Logradouro</Label>
                  <Input placeholder="Rua, Av..." value={form.tomadorEndereco} onChange={e => f("tomadorEndereco", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input placeholder="123" value={form.tomadorNumero} onChange={e => f("tomadorNumero", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input placeholder="Bairro" value={form.tomadorBairro} onChange={e => f("tomadorBairro", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cód. Município (IBGE)</Label>
                  <Input placeholder="ex: 3514700" value={form.tomadorCodigoMunicipio} onChange={e => f("tomadorCodigoMunicipio", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>UF</Label>
                  <Input placeholder="SP" maxLength={2} value={form.tomadorUf} onChange={e => f("tomadorUf", e.target.value.toUpperCase())} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>CEP</Label>
                  <Input placeholder="00000000" maxLength={8} value={form.tomadorCep} onChange={e => f("tomadorCep", e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmitOpen(false)} disabled={emitting}>Cancelar</Button>
            <Button onClick={handleEmit} disabled={emitting} className="gap-2">
              {emitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              {emitting ? "Emitindo..." : "Emitir NFS-e"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
