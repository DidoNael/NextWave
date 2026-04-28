"use client";

import { useState } from "react";
import { 
    FileText, 
    Download, 
    Send, 
    MessageSquare, 
    ExternalLink, 
    Code, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    Clock,
    Eye,
    RefreshCw,
    Mail,
    Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";

interface ClientNfseTabProps {
    clientId: string;
    nfseRecords: any[];
    onRefresh: () => void;
}

export function ClientNfseTab({ clientId, nfseRecords, onRefresh }: ClientNfseTabProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [viewXml, setViewXml] = useState<string | null>(null);
    const [showEmitDialog, setShowEmitDialog] = useState(false);
    const [emitLoading, setEmitLoading] = useState(false);
    const [emitData, setEmitData] = useState({
        valor: 0,
        discriminacao: "Prestação de serviços de tecnologia"
    });

    const handleSendEmail = async (id: string) => {
        setLoadingId(id + "_email");
        try {
            const res = await fetch(`/api/nfse/${id}/send-email`, { method: "POST" });
            if (res.ok) {
                toast.success("NFS-e enviada por e-mail!");
            } else {
                const data = await res.json();
                toast.error(data.error || "Erro ao enviar e-mail");
            }
        } catch {
            toast.error("Erro ao enviar e-mail");
        } finally {
            setLoadingId(null);
        }
    };

    const handleSendWhatsApp = async (id: string) => {
        setLoadingId(id + "_wpp");
        try {
            const res = await fetch(`/api/nfse/${id}/send-whatsapp`, { method: "POST" });
            if (res.ok) {
                toast.success("NFS-e enviada por WhatsApp!");
            } else {
                const data = await res.json();
                toast.error(data.error || "Erro ao enviar WhatsApp");
            }
        } catch {
            toast.error("Erro ao enviar WhatsApp");
        } finally {
            setLoadingId(null);
        }
    };

    const handleConsultStatus = async (id: string) => {
        setLoadingId(id + "_refresh");
        try {
            const res = await fetch(`/api/nfse/${id}`);
            if (res.ok) {
                onRefresh();
                toast.success("Status atualizado!");
            }
        } catch {
            toast.error("Erro ao atualizar status");
        } finally {
            setLoadingId(null);
        }
    };

    const handleEmitManual = async () => {
        if (emitData.valor <= 0) {
            toast.error("O valor da nota deve ser maior que zero");
            return;
        }

        setEmitLoading(true);
        try {
            const res = await fetch(`/api/nfse/emitir-manual`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    valor: emitData.valor,
                    discriminacao: emitData.discriminacao
                })
            });

            if (res.ok) {
                toast.success("Solicitação de emissão enviada com sucesso!");
                setShowEmitDialog(false);
                onRefresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "Erro ao emitir nota");
            }
        } catch {
            toast.error("Falha na comunicação com o servidor");
        } finally {
            setEmitLoading(false);
        }
    };

    const handleRetry = async (id: string) => {
        setLoadingId(id + "_retry");
        try {
            const res = await fetch(`/api/nfse/${id}/retry`, { method: "POST" });
            if (res.ok) {
                toast.success("Reenvio solicitado com sucesso!");
                onRefresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "Erro ao reenviar");
            }
        } catch {
            toast.error("Erro ao reenviar");
        } finally {
            setLoadingId(null);
        }
    };

    const handleViewPdf = (record: any) => {
        // Se temos link guardado ou gerável
        // Para GINFES usamos a lógica de subdomínio
        if (record.numeroNfse && record.codigoVerificacao) {
            // Em um sistema real, buscaríamos a config de município aqui. 
            // Para simplificar, usamos o portal unificado ou o que temos.
            const cleanCnpj = ""; // Seria ideal ter o cnpj aqui, mas o link já está no email.
            // Para visualização rápida no sistema, se não tivermos a URL pronta, avisamos.
            toast.info("Abrindo portal de visualização da prefeitura...");
            // Link genérico GINFES ou eNotas
            if (record.xmlRetorno?.includes("enotas")) {
                 const data = JSON.parse(record.xmlRetorno);
                 if (data.linkDownloadPdf) window.open(data.linkDownloadPdf, "_blank");
            } else {
                // Tenta abrir o link do GINFES se soubermos o município (padrão Guarulhos aqui para exemplo)
                const url = `https://guarulhos.ginfes.com.br/report/consultarNota?numeroNota=${record.numeroNfse}&codigoVerificacao=${record.codigoVerificacao}`;
                window.open(url, "_blank");
            }
        } else {
            toast.error("Dados insuficientes para visualizar o PDF desta nota.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border/50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-widest">Histórico de NFS-e</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onRefresh} className="h-8 gap-2">
                        <RefreshCw className="h-3 w-3" />
                        Sincronizar
                    </Button>
                    <Button size="sm" onClick={() => setShowEmitDialog(true)} className="h-8 gap-2 bg-primary text-primary-foreground">
                        <Plus className="h-3 w-3" />
                        Gerar NFS-e
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {nfseRecords && nfseRecords.length > 0 ? (
                    nfseRecords.map((record) => (
                        <div key={record.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-border/50 hover:border-primary/30 transition-all gap-4">
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "p-3 rounded-xl shrink-0 mt-1",
                                    record.status === 'emitida' ? "bg-emerald-100 text-emerald-600" : 
                                    record.status === 'erro' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                                )}>
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-800 dark:text-slate-100">
                                            {record.numeroNfse ? `NFS-e nº ${record.numeroNfse}` : "Processando..."}
                                        </p>
                                        <Badge variant={
                                            record.status === 'emitida' ? 'success' : 
                                            record.status === 'erro' ? 'destructive' : 'secondary'
                                        } className="text-[9px] h-4 leading-none uppercase">
                                            {record.status}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-sm">
                                        {record.discriminacao}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.valorServicos)}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDate(record.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1 transition-all">
                                {record.status === 'emitida' && (
                                    <>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                                            onClick={() => window.open(`/api/nfse/${record.id}/pdf`, "_blank")}
                                            title="Ver PDF"
                                        >
                                            <FileText className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                            onClick={() => {
                                                const blob = new Blob([record.xmlRetorno || ''], { type: 'text/xml' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `NFSe-${record.numeroNfse}.xml`;
                                                a.click();
                                            }}
                                            title="Baixar XML"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-slate-500 hover:bg-slate-100"
                                            onClick={() => setViewXml(record.xmlRetorno)}
                                            title="Ver Dados XML"
                                        >
                                            <Code className="h-4 w-4" />
                                        </Button>
                                        <div className="h-6 w-px bg-border mx-1 hidden md:block" />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-slate-500 hover:bg-slate-100"
                                            onClick={() => handleSendEmail(record.id)}
                                            disabled={loadingId === record.id + "_email"}
                                            title="Enviar por E-mail"
                                        >
                                            {loadingId === record.id + "_email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                                            onClick={() => handleSendWhatsApp(record.id)}
                                            disabled={loadingId === record.id + "_wpp"}
                                            title="Enviar por WhatsApp"
                                        >
                                            {loadingId === record.id + "_wpp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                                        </Button>
                                    </>
                                )}
                                {record.status === 'aguardando_processamento' && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 gap-2"
                                        onClick={() => handleConsultStatus(record.id)}
                                        disabled={loadingId === record.id + "_refresh"}
                                    >
                                        {loadingId === record.id + "_refresh" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                        Atualizar Status
                                    </Button>
                                )}
                                {record.status === 'erro' && (
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 text-xs gap-2 border-red-200 text-red-600 hover:bg-red-50"
                                            onClick={() => handleRetry(record.id)}
                                            disabled={loadingId === record.id + "_retry"}
                                        >
                                            {loadingId === record.id + "_retry" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                            Reenviar
                                        </Button>
                                        {record.errorMessage && (
                                            <div className="text-[10px] text-red-400 font-medium max-w-[150px] truncate" title={record.errorMessage}>
                                                {record.errorMessage}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl opacity-60">
                        <Receipt className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm font-medium">Nenhuma nota fiscal emitida para este cliente.</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">As notas podem ser geradas automaticamente ou manualmente.</p>
                        <Button size="sm" onClick={() => setShowEmitDialog(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Gerar Primeira NFS-e
                        </Button>
                    </div>
                )}
            </div>

            {/* Manual Emit Dialog */}
            <Dialog open={showEmitDialog} onOpenChange={setShowEmitDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gerar NFS-e Manual</DialogTitle>
                        <DialogDescription>
                            Preencha os dados abaixo para emitir a nota fiscal agora.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold">Valor do Serviço (R$)</label>
                            <input 
                                type="number" 
                                className="w-full p-2 rounded-lg border bg-background"
                                value={emitData.valor}
                                onChange={(e) => setEmitData({ ...emitData, valor: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold">Discriminação dos Serviços</label>
                            <textarea 
                                className="w-full p-2 rounded-lg border bg-background h-24"
                                value={emitData.discriminacao}
                                onChange={(e) => setEmitData({ ...emitData, discriminacao: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEmitDialog(false)}>Cancelar</Button>
                        <Button 
                            className="bg-primary text-white"
                            onClick={handleEmitManual}
                            disabled={emitLoading}
                        >
                            {emitLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Emitir Nota Agora
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* XML Viewer Dialog */}
            <Dialog open={!!viewXml} onOpenChange={() => setViewXml(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Code className="h-5 w-5 text-primary" />
                            Conteúdo do XML NFS-e
                        </DialogTitle>
                        <DialogDescription>Dados brutos enviados/recebidos da prefeitura.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 bg-slate-950 p-4 rounded-xl overflow-auto border border-white/10 mt-4">
                        <pre className="text-[11px] text-emerald-400 font-mono leading-relaxed">
                            {viewXml}
                        </pre>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setViewXml(null)}>Fechar</Button>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                                const blob = new Blob([viewXml || ''], { type: 'text/xml' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `NFSe.xml`;
                                a.click();
                            }}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar XML
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Receipt(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 17.5v-11" />
        </svg>
    )
}
