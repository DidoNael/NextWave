"use client";

import { useState, useEffect } from "react";
import {
    Puzzle, Save, RefreshCw, CheckCircle2, XCircle,
    MessageSquare, DollarSign, Users, Briefcase, Calendar, LayoutDashboard, Database, Server
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface SystemModule {
    key: string;
    name: string;
    description: string | null;
    enabled: boolean;
}

const ICON_MAP: Record<string, any> = {
    clientes: Users,
    financeiro: DollarSign,
    projetos: Briefcase,
    servicos: Database,
    agenda: Calendar,
    usuarios: Users,
    whatsapp: MessageSquare,
    mcp: Server,
};

export default function ModulosPage() {
    const [modules, setModules] = useState<SystemModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchModules();
    }, []);

    async function fetchModules() {
        try {
            const resp = await fetch("/api/sistema/modulos");
            if (!resp.ok) throw new Error("Falha ao buscar módulos");
            const data = await resp.json();
            setModules(data);
        } catch (error) {
            toast.error("Erro ao carregar módulos");
        } finally {
            setLoading(false);
        }
    }

    async function toggleModule(key: string, enabled: boolean) {
        setSaving(key);
        try {
            const resp = await fetch("/api/sistema/modulos", {
                method: "POST",
                body: JSON.stringify({ key, enabled }),
            });

            if (!resp.ok) throw new Error();

            setModules(prev => prev.map(m => m.key === key ? { ...m, enabled } : m));
            toast.success(`Módulo ${enabled ? 'ativado' : 'desativado'} com sucesso!`);

            // Foríºar atualização da sidebar se necessíírio (ex: refresh da píígina)
            if (key === 'financeiro' || key === 'whatsapp') {
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            toast.error("Erro ao atualizar módulo");
        } finally {
            setSaving(null);
        }
    }

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl animate-in">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl animate-in">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Puzzle className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold">Módulos do Sistema</h1>
                </div>
                <p className="text-muted-foreground">Ative ou desative funcionalidades conforme sua necessidade.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {modules.map((mod) => {
                    const Icon = ICON_MAP[mod.key] || Puzzle;
                    const isSaving = saving === mod.key;

                    return (
                        <Card key={mod.key} className={mod.enabled ? "border-primary/20 bg-primary/5" : "opacity-70"}>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={mod.enabled ? "p-2 rounded-lg bg-primary text-primary-foreground" : "p-2 rounded-lg bg-muted text-muted-foreground"}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{mod.name}</CardTitle>
                                            <Badge variant={mod.enabled ? "success" : "secondary"} className="mt-1">
                                                {mod.enabled ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={mod.enabled}
                                        disabled={isSaving}
                                        onCheckedChange={(v) => toggleModule(mod.key, v)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {mod.description || "Sem descrição disponível para este módulo."}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <RefreshCw className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Aviso sobre Ativação</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                Algumas alteraíºàes podem exigir o recarregamento da píígina para atualizar os menus de navegação.
                                Recomendamos salvar seu trabalho antes de desativar módulos principais.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

