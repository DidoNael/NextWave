"use client";

import { useEffect, useState } from "react";
import {
    Clock, Calendar, Play, Pause, Trash2, Plus,
    Mail, MessageSquare, Database, RefreshCw, AlertCircle,
    CheckCircle2, Settings2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduledTask {
    id: string;
    name: string;
    type: string;
    cron: string;
    status: string;
    lastRun: string | null;
    nextRun: string | null;
}

export default function AgendadorPage() {
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [newTask, setNewTask] = useState({
        name: "",
        type: "email_blast",
        cron: "0 0 * * *",
    });

    const fetchTasks = async () => {
        try {
            const res = await fetch("/api/sistema/agendador");
            const data = await res.json();
            if (Array.isArray(data)) setTasks(data);
        } catch (error) {
            toast.error("Erro ao carregar agendamentos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveLoading(true);
        try {
            const res = await fetch("/api/sistema/agendador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask),
            });
            if (res.ok) {
                toast.success("Tarefa agendada com sucesso!");
                setIsDialogOpen(false);
                fetchTasks();
            }
        } catch (error) {
            toast.error("Erro ao criar tarefa");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "disabled" : "active";
        try {
            const res = await fetch(`/api/sistema/agendador/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                toast.success(newStatus === "active" ? "Tarefa ativada" : "Tarefa pausada");
                fetchTasks();
            }
        } catch (error) {
            toast.error("Erro ao alterar status");
        }
    };

    const [runLoading, setRunLoading] = useState<string | null>(null);

    const handleRunTask = async (id: string) => {
        setRunLoading(id);
        try {
            const res = await fetch("/api/sistema/agendador/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId: id }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Tarefa executada com sucesso!");
                fetchTasks();
            } else {
                toast.error(data.error || "Erro ao executar tarefa");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setRunLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este agendamento?")) return;
        try {
            const res = await fetch(`/api/sistema/agendador/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Agendamento removido");
                fetchTasks();
            }
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "email_blast": return <Mail className="h-4 w-4" />;
            case "whatsapp_billing": return <MessageSquare className="h-4 w-4" />;
            case "backup": return <Database className="h-4 w-4" />;
            case "wa_check": return <RefreshCw className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case "email_blast": return "Disparo de E-mails";
            case "whatsapp_billing": return "Cobrança WhatsApp";
            case "backup": return "Backup do Sistema";
            case "wa_check": return "Versão WhatsApp";
            default: return type;
        }
    };

    return (
        <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">Agendador de Tarefas</h1>
                    </div>
                    <p className="text-muted-foreground">Gerencie automações, backups e disparos recorrentes.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 shadow-lg shadow-primary/20">
                            <Plus className="h-4 w-4" /> Novo Agendamento
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Novo Agendamento</DialogTitle>
                                <DialogDescription>Configure uma nova automação recorrente.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nome da Tarefa</Label>
                                    <Input
                                        placeholder="Ex: Backup de Segunda"
                                        value={newTask.name}
                                        onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid gap-4 grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select
                                            value={newTask.type}
                                            onValueChange={v => setNewTask({ ...newTask, type: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="email_blast">Disparo de E-mail</SelectItem>
                                                <SelectItem value="whatsapp_billing">Cobrança WhatsApp</SelectItem>
                                                <SelectItem value="backup">Backup Automático</SelectItem>
                                                <SelectItem value="wa_check">Verificar WhatsApp</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cron (Horário)</Label>
                                        <Input
                                            placeholder="0 3 * * *"
                                            value={newTask.cron}
                                            onChange={e => setNewTask({ ...newTask, cron: e.target.value })}
                                            required
                                        />
                                        <p className="text-[10px] text-muted-foreground px-1">Padrão: min hora dia mes sem</p>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={saveLoading} className="w-full">
                                    {saveLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                    Criar Agendamento
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 lg:grid-cols-1">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : tasks.length === 0 ? (
                    <Card className="border-dashed bg-card/20 border-border/60 p-12 text-center text-muted-foreground shadow-inner">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-10" />
                        <h3 className="font-bold text-foreground">Sem automações agendadas</h3>
                        <p className="text-sm max-w-xs mx-auto mt-2">Adicione tarefas recorrentes para automatizar seu fluxo de trabalho.</p>
                    </Card>
                ) : (
                    tasks.map((task) => (
                        <Card key={task.id} className={cn(
                            "group overflow-hidden transition-all border-border/40 hover:border-primary/40",
                            task.status !== "active" && "opacity-60 saturate-50"
                        )}>
                            <div className="flex items-center p-4 sm:p-6 gap-4">
                                <div className={cn(
                                    "p-3 rounded-2xl transition-colors",
                                    task.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    {getTypeIcon(task.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold truncate">{task.name}</h3>
                                        <Badge variant="outline" className="text-[10px] uppercase">{getTypeName(task.type)}</Badge>
                                        {task.status === "active" ? (
                                            <Badge className="bg-success/10 text-success border-success/20 text-[9px] px-1.5 h-4">ATIVO</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[9px] px-1.5 h-4">PAUSADO</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {task.cron}</span>
                                        <span className="flex items-center gap-1 hidden sm:flex">
                                            <AlertCircle className="h-3 w-3" /> Próximo: {task.nextRun ? new Date(task.nextRun).toLocaleString() : 'Calculando...'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/5"
                                        disabled={runLoading === task.id || task.status !== "active"}
                                        onClick={() => handleRunTask(task.id)}
                                    >
                                        {runLoading === task.id ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Play className="h-4 w-4 fill-current" />
                                        )}
                                    </Button>
                                    <Switch
                                        checked={task.status === "active"}
                                        onCheckedChange={() => handleToggleStatus(task.id, task.status)}
                                    />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(task.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
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
