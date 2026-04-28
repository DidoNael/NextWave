"use client";

import { useState, useEffect } from "react";
import {
    MessageSquare, GitBranch, Settings, Zap,
    CheckCircle2, XCircle, RefreshCw, Users, MessageCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function WhatsAppDashboard() {
    const params = useParams();
    const base = `/${params.orgSlug}`;
    const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch("/api/whatsapp/channels");
                if (!res.ok) return;
                const channels: any[] = await res.json();
                const hasOpen = channels.some((c: any) => c.isActive && (c.status === "open" || c.status === "connected"));
                const hasConnecting = channels.some((c: any) => c.isActive && c.status === "connecting");
                setStatus(hasOpen ? "connected" : hasConnecting ? "connecting" : "disconnected");
            } catch {}
        };
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">Módulo WhatsApp</h1>
                    </div>
                    <p className="text-muted-foreground">Gerencie suas comunicações e automações de atendimento.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge
                        variant={status === "connected" ? "success" : status === "connecting" ? "warning" : "destructive"}
                        className="h-6"
                    >
                        {status === "connected" ? (
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Conectado</span>
                        ) : status === "connecting" ? (
                            <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" /> Conectando</span>
                        ) : (
                            <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3" /> Desconectado</span>
                        )}
                    </Badge>
                    <Button variant="outline" size="sm" className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Atualizar
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary mb-2 group-hover:scale-110 transition-transform">
                            <MessageCircle className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg">Chat em Tempo Real</CardTitle>
                        <CardDescription>Responda seus clientes diretamente pelo CRM.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href={`${base}/whatsapp/chat`}>Abrir Chat</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary mb-2 group-hover:scale-110 transition-transform">
                            <GitBranch className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg">Fluxos de Atendimento</CardTitle>
                        <CardDescription>Crie automações visuais para recepção e triagem.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`${base}/whatsapp/fluxo`}>Criar Fluxo</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary mb-2 group-hover:scale-110 transition-transform">
                            <Settings className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg">Configurações</CardTitle>
                        <CardDescription>Configure sua API, tokens e webhooks do WhatsApp.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="ghost" className="w-full">
                            <Link href={`${base}/whatsapp/configuracoes`}>Ajustar Conexão</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Atividade Recente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                            <Zap className="h-8 w-8 text-muted-foreground/20" />
                            <p className="text-xs text-muted-foreground">Nenhuma atividade registrada.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            Estatísticas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-2xl font-bold">0</p>
                                <p className="text-xs text-muted-foreground">Mensagens hoje</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold">0</p>
                                <p className="text-xs text-muted-foreground">Novos contatos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
