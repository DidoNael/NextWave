"use client";

import { useState, useEffect } from "react";
import {
    Database, Download, RefreshCw, Trash2,
    AlertTriangle, CheckCircle2, Clock, HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BackupFile {
    name: string;
    size: number;
    createdAt: string;
}

export default function ManutencaoPage() {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const fetchBackups = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/sistema/manutencao");
            if (!res.ok) throw new Error();
            const data = await res.json();
            setBackups(data);
        } catch (error) {
            toast.error("Erro ao carregar lista de backups");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleCreateBackup = async () => {
        setIsCreating(true);
        try {
            const res = await fetch("/api/sistema/manutencao", { method: "POST" });
            if (!res.ok) throw new Error();
            toast.success("Backup gerado com sucesso!");
            fetchBackups();
        } catch (error) {
            toast.error("Erro ao gerar backup");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (name: string) => {
        try {
            const res = await fetch("/api/sistema/manutencao", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) throw new Error();
            toast.success("Backup excluído");
            fetchBackups();
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    const handleRestore = async (name: string) => {
        const promise = fetch("/api/sistema/manutencao/restaurar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });

        toast.promise(promise, {
            loading: 'Restaurando banco de dados... Não feche esta janela.',
            success: () => {
                setTimeout(() => window.location.reload(), 2000);
                return 'Restaurado com sucesso! Recarregando...';
            },
            error: 'Erro na restauração. Verifique o console.',
        });
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manutenção do Sistema</h1>
                    <p className="text-muted-foreground">Gerencie backups e restaurações do seu CRM.</p>
                </div>
                <Button onClick={handleCreateBackup} disabled={isCreating} className="gap-2">
                    {isCreating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    Gerar Backup Agora
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Histórico de Backups</CardTitle>
                        <CardDescription>Backups locais gerados nos últimos dias.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8"><RefreshCw className="animate-spin" /></div>
                        ) : backups.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                                <p className="mt-4 text-muted-foreground">Nenhum backup encontrado.</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {backups.map((backup) => (
                                    <div key={backup.name} className="flex items-center justify-between py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <HardDrive className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{backup.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(backup.createdAt).toLocaleString()} • {formatSize(backup.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="gap-2">
                                                        <RefreshCw className="h-3.5 w-3.5" /> Restaurar
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                                            <AlertTriangle className="h-5 w-5" /> Confirmar Restauração?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta ação irá sobrescrever o banco de dados atual com os dados deste backup.
                                                            O sistema será reiniciado. **Não pode ser desfeito.**
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRestore(backup.name)}>Confirmar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <Button variant="ghost" size="icon" className="text-destructive h-9 w-9" onClick={() => handleDelete(backup.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Estado de Saúde</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>Banco de Dados: Ativo</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>Storage: {backups.length}/10 slots usados</span>
                        </div>
                        <div className="pt-4 space-y-2">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Dicas de Manutenção</p>
                            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                <li>Gere backups antes de atualizações importantes.</li>
                                <li>Baixe os arquivos para um local seguro regularmente.</li>
                                <li>A restauração interrompe conexões ativas momentaneamente.</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
