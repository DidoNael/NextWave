"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import Link from "next/link";
import { Plus, Briefcase, ExternalLink, Clock, Copy, Check, KeyRound, ShieldOff, ShieldCheck, Ban, FlaskConical, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ClientServicosTabProps {
  services: any[];
  openCreateSvc: () => void;
  formatCurrency: (value: number) => string;
  onCancelSvc?: (id: string) => void;
  onRefresh?: () => void;
}

function LicenseBadge({ license }: { license: any }) {
  if (!license) return null;
  if (license.status === "blocked")
    return <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-[9px]">Bloqueada</Badge>;
  if (license.status === "suspended")
    return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[9px]">Suspensa</Badge>;
  if (license.isTrial) {
    const expired = license.trialEndsAt && new Date() > new Date(license.trialEndsAt);
    if (expired)
      return <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30 text-[9px]">Trial Expirado</Badge>;
    const days = license.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(license.trialEndsAt).getTime() - Date.now()) / 86400000))
      : null;
    return (
      <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-[9px] gap-1">
        <FlaskConical className="h-2.5 w-2.5" />
        Trial{days !== null ? ` — ${days}d` : ""}
      </Badge>
    );
  }
  return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[9px]">Ativa</Badge>;
}

function CopyKey({ licenseKey }: { licenseKey: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    copyToClipboard(licenseKey);
    setCopied(true);
    toast.success("Chave copiada!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">
      <span>{licenseKey.slice(0, 14)}…</span>
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

async function toggleLicenseStatus(licenseId: string, currentStatus: string, onRefresh?: () => void) {
  const newStatus = currentStatus === "suspended" ? "active" : "suspended";
  try {
    const res = await fetch(`/api/plugin-licenses/${licenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error();
    toast.success(newStatus === "suspended" ? "Licença suspensa." : "Licença reativada.");
    onRefresh?.();
  } catch {
    toast.error("Erro ao alterar status da licença.");
  }
}

export function ClientServicosTab({
  services,
  openCreateSvc,
  formatCurrency,
  onCancelSvc,
  onRefresh,
}: ClientServicosTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border/50">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Serviços & Orçamentos</h3>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg font-bold" onClick={openCreateSvc}>
          <Plus className="h-4 w-4 mr-2" /> Novo Serviço
        </Button>
      </div>

      <div className="grid gap-4">
        {services.length > 0 ? (
          services.map((svc: any) => {
            const isPlugin = svc.category === "Plugin Grafana";
            const license = svc.pluginLicense;
            return (
              <div key={svc.id} className="flex flex-col p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/50 hover:border-blue-500/30 transition-all gap-3">
                {/* Linha principal */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isPlugin ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-600"}`}>
                      {isPlugin ? <KeyRound className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{svc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold">{svc.status}</Badge>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">{svc.category || "Sem categoria"}</span>
                        {isPlugin && <LicenseBadge license={license} />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-base font-black text-blue-600">{formatCurrency(svc.amount)}</p>
                    </div>
                    <Link href={`/servicos/${svc.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver detalhes">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Painel de licença */}
                {isPlugin && license && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/60 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <CopyKey licenseKey={license.key} />
                    </div>
                    <div className="flex items-center gap-1">
                      {license.status !== "blocked" && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => toggleLicenseStatus(license.id, license.status, onRefresh)}
                          title={license.status === "suspended" ? "Reativar" : "Suspender"}
                        >
                          {license.status === "suspended"
                            ? <><ShieldCheck className="h-3.5 w-3.5" /> Reativar</>
                            : <><ShieldOff className="h-3.5 w-3.5" /> Suspender</>}
                        </Button>
                      )}
                      <Link href={`/servicos/${svc.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                          <Mail className="h-3.5 w-3.5" /> Enviar chave
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {isPlugin && !license && (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-3 py-2">
                    <p className="text-[11px] text-amber-600">Licença não gerada. Abra o serviço para criar.</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-3xl opacity-60">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Nenhum serviço vinculado.</p>
            <Button variant="link" size="sm" className="text-blue-600 font-bold" onClick={openCreateSvc}>
              Cadastrar Agora
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
