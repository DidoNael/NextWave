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
import Link from "next/link";

export default function WhatsAppDashboard() {
    const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");

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
                    <Badge variant={status === "connected" ? "success" : "destructive"} className="h-6">
                        {status === "connected" ? (
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Conectado</span>
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
                            <Link href="/whatsapp/chat">Abrir Chat</Link>
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
                            <Link href="/whatsapp/fluxo">Criar Fluxo</Link>
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
                            <Link href="/whatsapp/configuracoes">Ajustar Conexão</Link>
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
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-sm">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="flex-1">Novo contato: <span className="font-semibold">+55 11 99999-9999</span></span>
                                <span className="text-xs text-muted-foreground">há 5 min</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="h-2 w-2 rounded-full bg-sky-500" />
                                <span className="flex-1">Fluxo "Boas Vindas" iniciado p/ João</span>
                                <span className="text-xs text-muted-foreground">há 12 min</span>
                            </div>
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
                                <p className="text-2xl font-bold">128</p>
                                <p className="text-xs text-muted-foreground">Mensagens hoje</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold">12</p>
                                <p className="text-xs text-muted-foreground">Novos contatos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
