"use client";

import { useState, useEffect } from "react";
import { Server, Save, Loader2, Info, ShieldCheck, Key, Globe, Network, RefreshCw, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function generateApiKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const segments = [8, 4, 4, 4, 12];
    return segments.map(len =>
        Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    ).join("-");
}

export default function McpSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [config, setConfig] = useState({
        apiKey: "",
        allowedIps: "127.0.0.1",
        allowedOrigins: "*",
        rateLimit: 100,
        rateWindow: 60,
        logLevel: "info",
        port: 3001,
        isActive: false,
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/sistema/mcp");
            if (res.ok) {
                const data = await res.json();
                if (data) setConfig(data);
            }
        } catch {
            toast.error("Erro ao carregar configurações.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/sistema/mcp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                toast.success("Configurações do MCP salvas com sucesso!");
            } else {
                toast.error("Erro ao salvar configurações.");
            }
        } catch {
            toast.error("Erro na comunicação com o servidor.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateKey = () => {
        const newKey = generateApiKey();
        setConfig({ ...config, apiKey: newKey });
        toast.success("Nova API Key gerada! Lembre-se de salvar.");
    };

    const handleCopyKey = async () => {
        if (!config.apiKey) return;
        await navigator.clipboard.writeText(config.apiKey);
        setCopied(true);
        toast.success("API Key copiada!");
        setTimeout(() => setCopied(false), 2000);
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
                        <Server className="h-6 w-6 text-primary" />
                        MCP Server
                    </h1>
                    <p className="text-muted-foreground mt-1">Configure o servidor MCP para integração com agentes de IA.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant={config.isActive ? "success" : "secondary"} className="px-3 py-1">
                        {config.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                    <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-lg border">
                        <Label htmlFor="mcp-active" className="text-sm font-medium">Módulo</Label>
                        <Switch
                            id="mcp-active"
                            checked={config.isActive}
                            onCheckedChange={(val) => setConfig({ ...config, isActive: val })}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coluna Esquerda — Informações */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">O que é o MCP?</CardTitle>
                        <CardDescription>Model Context Protocol</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-2">
                            <div className="flex items-center gap-2 text-blue-500 font-semibold text-xs">
                                <Info className="h-4 w-4" />
                                <span>Sobre o MCP Server</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                O <strong>MCP Server</strong> expõe os dados do CRM (clientes, transações, projetos, agenda) como ferramentas e recursos para agentes de IA como Claude, ChatGPT e outros.
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Use para automatizar consultas, gerar relatórios inteligentes, e integrar com workflows de IA.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Endpoint</p>
                            <code className="text-xs bg-muted px-3 py-2 rounded-lg block font-mono break-all">
                                http://seu-ip:{config.port}/mcp
                            </code>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Transporte</p>
                            <p className="text-xs text-muted-foreground">Streamable HTTP (SSE)</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Coluna Direita — Configurações */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            Configurações de Segurança
                        </CardTitle>
                        <CardDescription>Defina as credenciais e limites de acesso ao MCP Server.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* API Key */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Key className="h-3.5 w-3.5" />
                                API Key
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={config.apiKey || ""}
                                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                    placeholder="Clique em Gerar para criar uma chave"
                                    className="font-mono text-xs"
                                    readOnly
                                />
                                <Button variant="outline" size="icon" className="shrink-0" onClick={handleCopyKey} title="Copiar">
                                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button variant="outline" className="shrink-0 gap-1" onClick={handleGenerateKey}>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Gerar
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Chave de autenticação para acessar o MCP Server. Envie no header <code className="bg-muted px-1 rounded">x-api-key</code>.</p>
                        </div>

                        <Separator />

                        {/* IPs e Origins */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Network className="h-3.5 w-3.5" />
                                    IPs Permitidos
                                </Label>
                                <Textarea
                                    value={config.allowedIps}
                                    onChange={(e) => setConfig({ ...config, allowedIps: e.target.value })}
                                    placeholder="127.0.0.1, 10.0.0.0/8"
                                    rows={3}
                                    className="font-mono text-xs"
                                />
                                <p className="text-[10px] text-muted-foreground">Separe múltiplos IPs por vírgula. Use <code className="bg-muted px-1 rounded">*</code> para aceitar todos.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Globe className="h-3.5 w-3.5" />
                                    Origins Permitidos
                                </Label>
                                <Textarea
                                    value={config.allowedOrigins}
                                    onChange={(e) => setConfig({ ...config, allowedOrigins: e.target.value })}
                                    placeholder="https://meusite.com, *"
                                    rows={3}
                                    className="font-mono text-xs"
                                />
                                <p className="text-[10px] text-muted-foreground">Origins CORS permitidos. Use <code className="bg-muted px-1 rounded">*</code> para aceitar todos.</p>
                            </div>
                        </div>

                        <Separator />

                        {/* Rate Limit, Window, Log Level, Porta */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Rate Limit</Label>
                                <Input
                                    type="number"
                                    value={config.rateLimit}
                                    onChange={(e) => setConfig({ ...config, rateLimit: parseInt(e.target.value) || 100 })}
                                />
                                <p className="text-[10px] text-muted-foreground">Requisições por janela</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Janela (seg)</Label>
                                <Input
                                    type="number"
                                    value={config.rateWindow}
                                    onChange={(e) => setConfig({ ...config, rateWindow: parseInt(e.target.value) || 60 })}
                                />
                                <p className="text-[10px] text-muted-foreground">Período em segundos</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Log Level</Label>
                                <Select value={config.logLevel} onValueChange={(val) => setConfig({ ...config, logLevel: val })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="debug">Debug</SelectItem>
                                        <SelectItem value="info">Info</SelectItem>
                                        <SelectItem value="warn">Warning</SelectItem>
                                        <SelectItem value="error">Error</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">Nível de log</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Porta</Label>
                                <Input
                                    type="number"
                                    value={config.port}
                                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 3001 })}
                                />
                                <p className="text-[10px] text-muted-foreground">Porta TCP do MCP</p>
                            </div>
                        </div>

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
