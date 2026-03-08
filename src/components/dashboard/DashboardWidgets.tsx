"use client";

import {
    DollarSign, MessageSquare, Database, Users,
    ArrowUpRight, ArrowDownRight, Clock, ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WidgetProps {
    title: string;
    value: string | number;
    description?: string;
    icon: any;
    trend?: number;
    trendLabel?: string;
}

export function FinanceWidget({ stats }: { stats: any }) {
    return (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl hover:border-primary/20 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Faturamento Mensal</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <DollarSign className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">R$ {stats.totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="flex items-center gap-2 mt-1">
                    {stats.variacaoReceita >= 0 ? (
                        <Badge className="bg-success/10 text-success border-success/20 gap-1 text-[10px]">
                            <ArrowUpRight className="h-3 w-3" /> {stats.variacaoReceita.toFixed(1)}%
                        </Badge>
                    ) : (
                        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px]">
                            <ArrowDownRight className="h-3 w-3" /> {Math.abs(stats.variacaoReceita).toFixed(1)}%
                        </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">vs mês passado</span>
                </div>
            </CardContent>
        </Card>
    );
}

export function WhatsAppWidget() {
    return (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl hover:border-primary/20 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">WhatsApp Service</CardTitle>
                <div className="p-2 bg-success/10 rounded-lg text-success">
                    <MessageSquare className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">Ativo</div>
                <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] border-success/30 text-success">2 Instâncias OK</Badge>
                    <span className="text-xs text-muted-foreground">148 msg hoje</span>
                </div>
            </CardContent>
        </Card>
    );
}

export function BackupWidget() {
    return (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl hover:border-primary/20 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Integridade do Sistema</CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                    <ShieldCheck className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-success">Protegido</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Database className="h-3 w-3" /> Last backup: 3h ago
                </div>
            </CardContent>
        </Card>
    );
}

export function TasksWidget() {
    return (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl hover:border-primary/20 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500" >
                    <Clock className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">4 Pendentes</div>
                <div className="text-xs text-muted-foreground mt-1">
                    Próxima: Cobrança via WhatsApp (10:00)
                </div>
            </CardContent>
        </Card>
    );
}
