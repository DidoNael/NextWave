"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CreditCard, ShieldCheck, Zap, AlertCircle, Loader2 } from "lucide-react";

export default function PagamentosSettings() {
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const res = await fetch("/api/sistema/pagamentos");
            const data = await res.json();
            setConfigs(data);
        } catch (error) {
            toast.error("Erro ao carregar configurações");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (provider: string, configData: any) => {
        setSaving(provider);
        try {
            const res = await fetch("/api/sistema/pagamentos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(configData)
            });
            if (res.ok) {
                toast.success(`Configuração de ${configData.name} salva!`);
                fetchConfigs();
            } else {
                throw new Error();
            }
        } catch (error) {
            toast.error("Erro ao salvar");
        } finally {
            setSaving(null);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto animate-in">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Gateways de Pagamento</h1>
                    <p className="text-muted-foreground">Configure como você recebe pagamentos e assinaturas.</p>
                </div>
            </div>

            {/* Gateway: InfinitePay */}
            <Card className="overflow-hidden border-purple-500/10 shadow-lg shadow-purple-500/5">
                <div className="h-1 bg-purple-500" />
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="https://infinitepay.io/favicon.ico" className="w-6 h-6 rounded" alt="InfinitePay" />
                            <div>
                                <CardTitle>InfinitePay</CardTitle>
                                <CardDescription>Receba via Pix e Cartão com as melhores taxas.</CardDescription>
                            </div>
                        </div>
                        <Switch
                            checked={configs.find(c => c.provider === "infinitepay")?.isActive || false}
                            onCheckedChange={(val) => {
                                const current = configs.find(c => c.provider === "infinitepay") || { provider: "infinitepay", name: "InfinitePay", credentials: "{}" };
                                handleSave("infinitepay", { ...current, isActive: val });
                            }}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="infinite-tag">Link de Pagamento (Tag/Handle)</Label>
                        <Input
                            id="infinite-tag"
                            placeholder="ex: seunegocio"
                            defaultValue={JSON.parse(configs.find(c => c.provider === "infinitepay")?.credentials || "{}").infiniteTag || ""}
                            onBlur={(e) => {
                                const current = configs.find(c => c.provider === "infinitepay") || { provider: "infinitepay", name: "InfinitePay", credentials: "{}" };
                                const creds = JSON.parse(current.credentials || "{}");
                                creds.infiniteTag = e.target.value;
                                handleSave("infinitepay", { ...current, credentials: JSON.stringify(creds) });
                            }}
                        />
                        <p className="text-[10px] text-muted-foreground">O mesmo que aparece no seu link infinitepay.io/pay/sua-tag</p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-xl border border-border flex gap-3 text-sm">
                        <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                        <div>
                            <p className="font-bold">Webhook Automático</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Configure este URL na sua conta InfinitePay para baixar faturas automaticamente:
                                <code className="block mt-2 p-1 bg-background rounded border font-mono text-[10px]">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/payments/infinitepay` : ""}
                                </code>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Placeholder for Next Gateway */}
            <Card className="opacity-60 border-dashed">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-[10px] font-bold">???</div>
                            <div>
                                <CardTitle>Mercado Pago</CardTitle>
                                <CardDescription>Em breve...</CardDescription>
                            </div>
                        </div>
                        <Switch disabled />
                    </div>
                </CardHeader>
            </Card>

            <div className="flex gap-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
                <p className="text-xs leading-relaxed">
                    <strong>Privacidade & Segurança:</strong> Seus dados de conexão são armazenados de forma segura e utilizados apenas para gerar os links de checkout e processar retornos de pagamento.
                </p>
            </div>
        </div>
    );
}
