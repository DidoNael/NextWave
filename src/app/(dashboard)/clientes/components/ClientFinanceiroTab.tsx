"use client";

import { useState } from "react";
import {
    DollarSign, TrendingUp, TrendingDown,
    Receipt, Edit, Trash2, QrCode, MessageSquare, Mail, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface ClientFinanceiroTabProps {
    transactions: any[];
    totalReceita: number;
    totalDespesa: number;
    totalPendente: number;
    openCreateTx: (type: "receita" | "despesa") => void;
    openEditTx: (tx: any) => void;
    setDeleteTxId: (id: string) => void;
    formatCurrency: (value: number) => string;
    clientPhone?: string | null;
    clientName?: string | null;
}

export function ClientFinanceiroTab({
    transactions,
    totalReceita,
    totalDespesa,
    totalPendente,
    openCreateTx,
    openEditTx,
    setDeleteTxId,
    formatCurrency,
    clientPhone,
    clientName,
}: ClientFinanceiroTabProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [loadingTxId, setLoadingTxId] = useState<string | null>(null);

    const handlePaymentLink = async (tx: any) => {
        setLoadingTxId(tx.id + "_link");
        try {
            const res = await fetch(`/api/financeiro/${tx.id}/pagar`, { method: "POST" });
            const data = await res.json();
            if (data.url) {
                window.open(data.url, "_blank");
            } else {
                toast.error("Erro ao gerar link de pagamento");
            }
        } catch {
            toast.error("Erro ao gerar link de pagamento");
        } finally {
            setLoadingTxId(null);
        }
    };

    const handleQrCode = async (tx: any) => {
        setLoadingTxId(tx.id + "_qr");
        try {
            const res = await fetch(`/api/financeiro/${tx.id}/pagar`, { method: "POST" });
            const data = await res.json();
            if (data.url) {
                setQrCodeUrl(data.url);
            } else {
                toast.error("Erro ao gerar QR Code Pix");
            }
        } catch {
            toast.error("Erro ao gerar QR Code Pix");
        } finally {
            setLoadingTxId(null);
        }
    };

    const handleWhatsApp = async (tx: any) => {
        if (!clientPhone) {
            toast.error("Cliente sem telefone cadastrado");
            return;
        }
        setLoadingTxId(tx.id + "_wpp");
        try {
            const phone = clientPhone.replace(/\D/g, "");
            const vencimento = tx.dueDate ? formatDate(tx.dueDate) : "em aberto";
            const msg =
                `Olá ${clientName || ""}! 👋\n\n` +
                `Passando para lembrar sobre a cobrança:\n` +
                `📋 *${tx.description}*\n` +
                `💰 *${formatCurrency(tx.amount)}*\n` +
                `📅 Vencimento: ${vencimento}\n\n` +
                `Qualquer dúvida, estamos à disposição!`;

            const res = await fetch("/api/whatsapp/messages/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ number: phone, text: msg }),
            });
            if (res.ok) {
                toast.success(`Cobrança enviada via WhatsApp para ${clientName || phone}!`);
            } else {
                toast.error("Erro ao enviar cobrança via WhatsApp");
            }
        } catch {
            toast.error("Erro ao enviar cobrança via WhatsApp");
        } finally {
            setLoadingTxId(null);
        }
    };

    const handleEmail = () => {
        toast.info("Envio de e-mail de cobrança em breve.");
    };

    return (
        <div className="space-y-6">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Total Receita</p>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(totalReceita)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30">
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mb-1">Total Despesa</p>
                    <p className="text-xl font-black text-rose-700 dark:text-rose-300">{formatCurrency(totalDespesa)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-1">Pendente</p>
                    <p className="text-xl font-black text-amber-700 dark:text-amber-300">{formatCurrency(totalPendente)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Saldo Atual</p>
                    <p className={cn("text-xl font-black", totalReceita - totalDespesa >= 0 ? "text-blue-700 dark:text-blue-300" : "text-rose-700 dark:text-rose-300")}>
                        {formatCurrency(totalReceita - totalDespesa)}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border/50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Histórico de Transações</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Gestão automatizada via Serviços</p>
            </div>

            <div className="space-y-3">
                {transactions.length > 0 ? (
                    transactions.map((tx: any) => (
                        <div key={tx.id} className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/50 hover:border-indigo-500/30 transition-all gap-3">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                    tx.type === "receita" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                )}>
                                    {tx.type === "receita" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{tx.description}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase">{tx.category} • {tx.dueDate ? formatDate(tx.dueDate) : "S/ data"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {/* Botões de cobrança — só para receitas pendentes */}
                                {tx.status === "pendente" && tx.type === "receita" && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                            title="Link de Pagamento"
                                            onClick={() => handlePaymentLink(tx)}
                                            disabled={!!loadingTxId}
                                        >
                                            {loadingTxId === tx.id + "_link"
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <DollarSign className="h-3.5 w-3.5" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                            title="QR Code Pix"
                                            onClick={() => handleQrCode(tx)}
                                            disabled={!!loadingTxId}
                                        >
                                            {loadingTxId === tx.id + "_qr"
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <QrCode className="h-3.5 w-3.5" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            title="Cobrança WhatsApp"
                                            onClick={() => handleWhatsApp(tx)}
                                            disabled={!!loadingTxId}
                                        >
                                            {loadingTxId === tx.id + "_wpp"
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <MessageSquare className="h-3.5 w-3.5" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            title="E-mail de Cobrança"
                                            onClick={handleEmail}
                                        >
                                            <Mail className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}

                                <div className="text-right">
                                    <p className={cn("text-base font-black", tx.type === "receita" ? "text-emerald-500" : "text-rose-500")}>
                                        {tx.type === "receita" ? "+" : "-"} {formatCurrency(tx.amount)}
                                    </p>
                                    <Badge variant={tx.status === "pago" ? "success" : "secondary"} className="text-[8px] h-4 uppercase">
                                        {tx.status}
                                    </Badge>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTx(tx)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTxId(tx.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-3xl opacity-60">
                        <Receipt className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm font-medium">Nenhuma transação registrada.</p>
                    </div>
                )}
            </div>

            {/* QR Code Pix Dialog */}
            <Dialog open={!!qrCodeUrl} onOpenChange={() => setQrCodeUrl(null)}>
                <DialogContent className="max-w-xs text-center">
                    <DialogHeader>
                        <DialogTitle>Pagamento via Pix</DialogTitle>
                        <DialogDescription>Aponte o celular para realizar o pagamento.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner mt-2">
                        {qrCodeUrl && (
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                                alt="QR Code Pix"
                                className="w-48 h-48"
                            />
                        )}
                        <p className="text-[10px] text-muted-foreground mt-3 break-all opacity-50">{qrCodeUrl}</p>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            className="w-full bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => window.open(qrCodeUrl || "", "_blank")}
                        >
                            Abrir Checkout Completo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
