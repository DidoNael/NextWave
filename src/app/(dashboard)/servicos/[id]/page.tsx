"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Copy, Mail, KeyRound, CheckCircle2, XCircle,
  PauseCircle, Clock, RefreshCw, ExternalLink, Loader2
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

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [service, setService] = useState<any>(null);
  const [license, setLicense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/servicos/${id}`).then(r => r.json()),
      fetch(`/api/servicos/${id}/license`).then(r => r.json()),
    ]).then(([svc, lic]) => {
      setService(svc);
      setLicense(lic);
      if (lic?.customerEmail) setEmailInput(lic.customerEmail);
    }).finally(() => setLoading(false));
  }, [id]);

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
