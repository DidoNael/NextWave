"use client";

import { useState, useEffect } from "react";
import { DollarSign, Save, Loader2, Info, CreditCard, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function InfinitePaySettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState({
        infiniteTag: "",
        isActive: false
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/sistema/pagamentos/infinitepay");
            if (res.ok) {
                const data = await res.json();
                if (data) setConfig(data);
            }
        } catch (error) {
            toast.error("Erro ao carregar configurações.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/sistema/pagamentos/infinitepay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                toast.success("Configurações da InfinitePay salvas!");
            } else {
                toast.error("Erro ao salvar configurações.");
            }
        } catch (error) {
            toast.error("Erro na comunicação com o servidor.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl animate-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-purple-500" />
                        Configuração InfinitePay
                    </h1>
                    <p className="text-muted-foreground mt-1">Configure o checkout integrado para receber pagamentos.</p>
                </div>
                <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-lg border">
                    <Label htmlFor="pay-active" className="text-sm font-medium">Integração Ativa</Label>
                    <Switch
                        id="pay-active"
                        checked={config.isActive}
                        onCheckedChange={(val) => setConfig({ ...config, isActive: val })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 border-purple-500/20 bg-purple-500/5">
                    <CardHeader>
                        <CardTitle className="text-lg">O que é o Checkout?</CardTitle>
                        <CardDescription>Entenda como funciona o link de pagamento.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <LinkIcon className="h-5 w-5 text-purple-500 mt-1" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                O Checkout Integrado permite criar links personalizados. Seus clientes pagam por Pix ou Cartão e o status é atualizado aqui.
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <CreditCard className="h-5 w-5 text-purple-500 mt-1" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Suporta parcelamento e as melhores taxas do mercado.
                            </p>
                        </div>
                        <a
                            href="https://confere.cloud/checkout-infinitepay"
                            target="_blank"
                            className="flex items-center gap-2 text-xs text-purple-500 font-bold hover:underline"
                        >
                            Ver tutorial oficial <ExternalLink className="h-3 w-3" />
                        </a>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Credenciais</CardTitle>
                        <CardDescription>Insira sua InfiniteTag para começar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>InfiniteTag (User ID)</Label>
                            <Input
                                value={config.infiniteTag || ""}
                                onChange={e => setConfig({ ...config, infiniteTag: e.target.value })}
                                placeholder="Ex: seu-negocio"
                            />
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Info className="h-3 w-3" /> Sua InfiniteTag é o nome que aparece no seu perfil da InfinitePay.
                            </p>
                        </div>

                        <Separator />

                        <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-lg space-y-2">
                            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                                <Info className="h-4 w-4" />
                                <span>Configuração de Webhook</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Para que o sistema identifique pagamentos automaticamente, você deve configurar a seguinte URL como Webhook no painel da InfinitePay:<br />
                                <code className="bg-white/50 px-1 rounded font-mono text-purple-600 font-bold break-all">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/infinitepay` : '.../api/webhooks/infinitepay'}
                                </code>
                            </p>
                        </div>

                        <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 gap-2 text-md font-bold bg-purple-600 hover:bg-purple-700">
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Salvar Configuração
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function Separator() {
    return <div className="h-[1px] w-full bg-border my-2" />;
}
