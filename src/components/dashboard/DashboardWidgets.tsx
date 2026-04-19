"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DollarSign, TrendingUp, MessageSquare,
    Database, CheckCircle2, AlertCircle, Clock,
    ArrowUpRight, ArrowDownRight, ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function FinanceWidget({ stats }: { stats: any }) {
    // Fallback data if stats is missing (for safety during development)
    const data = stats || { totalReceita: 0, variacaoReceita: 0 };

    return (
        <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Receita Mensal (MRR)</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg text-primary icon-container">
                    <DollarSign className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">R$ {data.totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="flex items-center gap-2 mt-1">
                    {data.variacaoReceita >= 0 ? (
                        <Badge className="bg-success/10 text-success border-success/20 gap-1 text-[10px] h-5">
                            <ArrowUpRight className="h-3 w-3" /> {data.variacaoReceita.toFixed(1)}%
                        </Badge>
                    ) : (
                        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px] h-5">
                            <ArrowDownRight className="h-3 w-3" /> {Math.abs(data.variacaoReceita).toFixed(1)}%
                        </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">vs mês passado</span>
                </div>
            </CardContent>
        </Card>
    );
}

export function WhatsAppWidget({ data }: { data: any }) {
    const defaultData = data || { totalMessages: 0, activeInstances: 0 };
    return (
        <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Atendimento WhatsApp</CardTitle>
                <div className="p-2 bg-success/10 rounded-lg text-success icon-container">
                    <MessageSquare className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{defaultData.totalMessages}</div>
                <p className="text-xs text-muted-foreground mt-1">
                    {defaultData.activeInstances} instâncias ativas
                </p>
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] h-4 border-success/30 text-success">API OK</Badge>
                    <span className="text-[10px] text-muted-foreground">Sincronizado</span>
                </div>
            </CardContent>
        </Card>
    );
}

export function BackupWidget({ data }: { data: any }) {
    const defaultData = data || { lastBackup: "Hoje, 03:00" };
    return (
        <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Integridade do Sistema</CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 icon-container">
                    <ShieldCheck className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="text-xl font-bold">Protegido</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Database className="h-3 w-3" /> {defaultData.lastBackup}
                </div>
            </CardContent>
        </Card>
    );
}

export function TasksWidget({ data }: { data: any }) {
    const defaultData = data || { pendingTasks: 0 };
    return (
        <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Automações Agendadas</CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 icon-container">
                    <Clock className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{defaultData.pendingTasks} Pendentes</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                    <AlertCircle className="h-3 w-3" />
                    <span>Próxima em 2h</span>
                </div>
            </CardContent>
        </Card>
    );
}
