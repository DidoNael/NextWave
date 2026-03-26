"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, FileText, Download, Loader2, PenTool } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function ContractPublicView({ contract }: { contract: any }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(contract.status);
    const [name, setName] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    const handleSign = async () => {
        if (!name.trim() || !accepted) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/contracts/${contract.id}/sign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signatureName: name }),
            });
            const data = await res.json();
            setStatus("assinado");
            setPaymentUrl(data.paymentUrl || null);
            toast.success("Contrato assinado digitalmente!");
            
            if (data.paymentUrl) {
                setTimeout(() => {
                    window.location.href = data.paymentUrl;
                }, 2000);
            }
        } catch {
            toast.error("Erro ao assinar contrato");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Contrato Digital</h1>
                    <p className="text-slate-500 font-medium">Ref: {contract.quote?.title || "Prestação de Serviços"}</p>
                </div>
                <Badge variant={status === "assinado" ? "success" : "secondary"} className="text-sm px-4 py-1 rounded-full font-bold uppercase">
                    {status}
                </Badge>
            </div>

            <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 mb-8 overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-8">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl font-black uppercase tracking-widest text-slate-400">Termos do Contrato</CardTitle>
                        <Button variant="ghost" size="icon" className="hover:bg-slate-200 dark:hover:bg-slate-700">
                            <Download className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-12 prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                        {contract.content || "Carregando conteúdo do contrato..."}
                        {"\n\n"}
                        <Separator className="my-8" />
                        <h4 className="font-black text-xl mb-4">Cláusulas e Condições</h4>
                        <p>1. O contratante concorda com os serviços descritos no orçamento {contract.quoteId}.</p>
                        <p>2. O pagamento será realizado conforme os prazos acordados na proposta comercial.</p>
                        <p>3. A assinatura digital possui validade jurídica conforme leis locais.</p>
                    </div>
                </CardContent>
            </Card>

            {status === "pendente" ? (
                <Card className="border-2 border-primary shadow-2xl shadow-primary/10 bg-white dark:bg-slate-900 overflow-hidden">
                    <CardHeader className="bg-primary text-primary-foreground p-6">
                        <div className="flex items-center gap-3">
                            <PenTool className="h-6 w-6" />
                            <CardTitle className="text-xl font-black uppercase tracking-widest">Assinatura Eletrônica</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="signer-name" className="font-bold text-slate-600 dark:text-slate-400">Nome Completo do Assinante</Label>
                                <Input
                                    id="signer-name"
                                    placeholder="Digite seu nome completo como no documento"
                                    className="h-14 text-lg font-bold border-2 focus-visible:ring-primary"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="flex items-start space-x-3 pt-2">
                                <Checkbox
                                    id="terms"
                                    checked={accepted}
                                    onCheckedChange={(checked) => setAccepted(checked === true)}
                                    className="mt-1 h-5 w-5 border-2"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="terms"
                                        className="text-sm font-medium text-slate-600 dark:text-slate-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 leading-snug"
                                    >
                                        Eu declaro que li e concordo com os termos deste contrato e que esta assinatura digital é juridicamente vinculativa.
                                    </label>
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full h-16 text-xl font-black gap-3 shadow-xl shadow-primary/30"
                            disabled={!name.trim() || !accepted || loading}
                            onClick={handleSign}
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
                            ASSINAR AGORA
                        </Button>

                        <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                            Seu IP e dados do navegador serão registrados para validade jurídica desta assinatura.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="bg-emerald-500 border-none shadow-2xl shadow-emerald-500/20 p-12 rounded-[2rem] text-center text-white space-y-6">
                    <div className="h-24 w-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-16 w-16" />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter">Documento Assinado</h2>
                        <p className="text-white/80 font-bold mt-2">Obrigado pela confiança! Seu contrato foi processado e validado.</p>
                    </div>

                    {paymentUrl && (
                        <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl border border-white/30 animate-pulse">
                            <p className="font-black text-sm uppercase tracking-widest mb-2">Redirecionando para pagamento...</p>
                            <Button className="w-full bg-white text-emerald-600 hover:bg-slate-100 font-black h-12" onClick={() => window.location.href = paymentUrl}>
                                PAGAR AGORA
                            </Button>
                        </div>
                    )}

                    <div className="pt-6 grid grid-cols-2 gap-4 max-w-sm mx-auto">
                        <div className="text-left bg-white/10 p-4 rounded-xl">
                            <p className="text-[10px] font-black uppercase opacity-60">Assinado em</p>
                            <p className="font-bold text-sm">{new Date().toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div className="text-left bg-white/10 p-4 rounded-xl">
                            <p className="text-[10px] font-black uppercase opacity-60">Pelo IP</p>
                            <p className="font-bold text-sm">Registrado</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
