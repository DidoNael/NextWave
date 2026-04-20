"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Users, Trash2, Edit2, Loader2, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Group {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    userCount: number;
}

export default function GruposPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const fetchGroups = async () => {
        try {
            const res = await fetch("/api/grupos");
            const data = await res.json();
            setGroups(data);
        } catch (error) {
            toast.error("Erro ao carregar grupos");
            // Mock para visualização se a API falhar
            setGroups([
                { id: "1", name: "Administradores", description: "Acesso total ao sistema", permissions: ["all"], userCount: 2 },
                { id: "2", name: "Suporte", description: "Acesso a clientes e tickets", permissions: ["view_clients", "manage_tickets"], userCount: 5 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight theme-title">Grupos e Permissões</h1>
                    <p className="text-muted-foreground text-sm">Gerencie os níveis de acesso e grupos de usuários do sistema.</p>
                </div>

                <Button className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" /> Novo Grupo
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {loading ? (
                    Array(2).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse kpi-card">
                            <CardHeader className="h-24 bg-muted/20" />
                            <CardContent className="h-16" />
                        </Card>
                    ))
                ) : (
                    groups.map((group) => (
                        <Card key={group.id} className="kpi-card hover:border-primary/30 transition-all group">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary mb-2">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <Badge variant="outline" className="gap-1">
                                        <Users className="h-3 w-3" /> {group.userCount} usuários
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    {group.name}
                                    {group.permissions.includes("all") && (
                                        <Lock className="h-3 w-3 text-amber-500" />
                                    )}
                                </CardTitle>
                                <CardDescription>{group.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {group.permissions.map((perm) => (
                                            <Badge key={perm} variant="secondary" className="text-[10px] uppercase font-bold py-0 h-5">
                                                {perm}
                                            </Badge>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1">
                                            <Edit2 className="h-3 w-3" /> Editar
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1 text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-3 w-3" /> Remover
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Card className="bg-primary/5 border-primary/10">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-primary/20 rounded-full">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-sm">
                        <p className="font-bold">Dica de Segurança</p>
                        <p className="text-muted-foreground">Utilize o princípio do privilégio mínimo ao atribuir permissões aos grupos.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
