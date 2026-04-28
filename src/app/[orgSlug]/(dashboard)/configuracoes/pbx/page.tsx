"use client";

import { useState, useEffect } from "react";
import { Phone, Save, Loader2, Info, ShieldCheck, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function PbxSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState({
        provider: "simulator",
        apiKey: "",
        apiSecret: "",
        accountSid: "",
        sipDomain: "",
        sipUser: "",
        sipPassword: "",
        isActive: false
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/sistema/pbx");
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
            const res = await fetch("/api/sistema/pbx", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                toast.success("Configurações de PBX salvas com sucesso!");
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
                        <Phone className="h-6 w-6 text-primary" />
                        Configuração de PBX & Telefonia
                    </h1>
                    <p className="text-muted-foreground mt-1">Conecte seu CRM a um provedor de voz para chamadas integradas.</p>
                </div>
                <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-lg border">
                    <Label htmlFor="pbx-active" className="text-sm font-medium">Módulo Ativo</Label>
                    <Switch
                        id="pbx-active"
                        checked={config.isActive}
                        onCheckedChange={(val) => setConfig({ ...config, isActive: val })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Provedor</CardTitle>
                        <CardDescription>Escolha como o sistema fará as ligações.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tipo de Conexão</Label>
                            <Select
                                value={config.provider}
                                onValueChange={(val) => setConfig({ ...config, provider: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="simulator">Simulador (Testes)</SelectItem>
                                    <SelectItem value="twilio">Twilio (API)</SelectItem>
                                    <SelectItem value="sip">SIP Tradicional (PABX)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-2">
                            <div className="flex items-center gap-2 text-blue-500 font-semibold text-xs">
                                <Info className="h-4 w-4" />
                                <span>Sobre os provedores</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                <strong>Twilio:</strong> Ideal para setup rápido com númros virtuais.<br /><br />
                                <strong>SIP:</strong> Conecte diretamente ao seu Asterisk, FreePBX ou provedor VoIP via WebSocket.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            {config.provider === "twilio" ? "Credenciais Twilio" : config.provider === "sip" ? "Configuração SIP" : "Configuração do Simulador"}
                        </CardTitle>
                        <CardDescription>Preencha os dados técnicos manualmente abaixo.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {config.provider === "twilio" && (
                            <>
                                <div className="space-y-2">
                                    <Label>Account SID</Label>
                                    <Input
                                        value={config.accountSid || ""}
                                        onChange={e => setConfig({ ...config, accountSid: e.target.value })}
                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>API Key</Label>
                                        <Input
                                            value={config.apiKey || ""}
                                            onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                                            placeholder="SKxxxxxxxx"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>API Secret</Label>
                                        <Input
                                            type="password"
                                            value={config.apiSecret || ""}
                                            onChange={e => setConfig({ ...config, apiSecret: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {config.provider === "sip" && (
                            <>
                                <div className="space-y-2">
                                    <Label>Domínio SIP / WebSocket URL</Label>
                                    <Input
                                        value={config.sipDomain || ""}
                                        onChange={e => setConfig({ ...config, sipDomain: e.target.value })}
                                        placeholder="wss://meupabx.com:8089/ws"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Usuário SIP</Label>
                                        <Input
                                            value={config.sipUser || ""}
                                            onChange={e => setConfig({ ...config, sipUser: e.target.value })}
                                            placeholder="1001"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Senha SIP</Label>
                                        <Input
                                            type="password"
                                            value={config.sipPassword || ""}
                                            onChange={e => setConfig({ ...config, sipPassword: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {config.provider === "simulator" && (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                                <Server className="h-12 w-12" />
                                <p className="text-sm">O modo simulador não requer credenciais externas.<br />Útil para treinamento da equipe.</p>
                            </div>
                        )}

                        <Separator className="my-4" />

                        <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 gap-2 text-md font-bold">
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Salvar Configurações
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
