"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, AlertCircle, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Job {
    id: string;
    name: string;
    description: string;
    schedule: string;
    lastRun: string | null;
    nextRun: string | null;
    status: "idle" | "running" | "failed";
    enabled: boolean;
}

export default function AgendadorPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningId, setRunningId] = useState<string | null>(null);

    const fetchJobs = async () => {
        try {
            const res = await fetch("/api/sistema/agendador");
            const data = await res.json();
            setJobs(data);
        } catch (error) {
            toast.error("Erro ao carregar tarefas agendadas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const runJob = async (id: string) => {
        setRunningId(id);
        try {
            const res = await fetch(`/api/sistema/agendador/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId: id })
            });

            if (res.ok) {
                toast.success("Tarefa executada com sucesso");
                fetchJobs();
            } else {
                toast.error("Falha ao executar tarefa");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setRunningId(null);
        }
    };

    const getStatusBadge = (status: Job["status"]) => {
        switch (status) {
            case "running":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse">Rodando</Badge>;
            case "failed":
                return <Badge variant="destructive">Falhou</Badge>;
            default:
                return <Badge variant="secondary">Aguardando</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight theme-title">Agendador de Tarefas</h1>
                <p className="text-muted-foreground text-sm">Gerencie automações e rotinas periódicas do sistema.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse kpi-card">
                            <CardHeader className="h-24 bg-muted/20" />
                            <CardContent className="h-16" />
                        </Card>
                    ))
                ) : jobs.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                        Nenhuma tarefa agendada encontrada.
                    </div>
                ) : (
                    jobs.map((job) => (
                        <Card key={job.id} className={cn("kpi-card", !job.enabled && "opacity-60")}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary mb-2">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    {getStatusBadge(job.status)}
                                </div>
                                <CardTitle className="text-lg">{job.name}</CardTitle>
                                <CardDescription className="text-xs line-clamp-2">{job.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Frequência:</span>
                                        <span className="font-mono">{job.schedule}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-[10px] uppercase">Próxima Execução:</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {job.nextRun ? new Date(job.nextRun).toLocaleString() : "N/A"}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button 
                                        variant="outline" 
                                        className="w-full h-8 text-xs gap-2"
                                        onClick={() => runJob(job.id)}
                                        disabled={runningId !== null || job.status === "running"}
                                    >
                                        {runningId === job.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Play className="h-3 w-3" />
                                        )}
                                        Executar Agora
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Card className="bg-muted/30 border-dashed border-border/10">
                <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                    <div className="text-xs space-y-1">
                        <p className="font-bold">Nota sobre execução:</p>
                        <p className="text-muted-foreground">
                            As tarefas agendadas dependem de um worker ativo no servidor.
                            Verifique as configurações de manutenção para garantir que o monitor de infraestrutura esteja rodando corretamente.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
