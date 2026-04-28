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
import { cn } from "@/lib/utils";
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
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || 'Erro desconhecido');
            toast.success("Backup gerado com sucesso!");
            fetchBackups();
        } catch (error: any) {
            toast.error(`Erro ao gerar backup: ${error.message}`);
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

    const totalSize = backups.reduce((acc, curr) => acc + curr.size, 0);
    const lastBackup = backups.length > 0 ? new Date(backups[0].createdAt) : null;

    return (
        <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard de Manutenção</h1>
                    <p className="text-muted-foreground">Monitoramento e integridade dos dados do CRM.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={fetchBackups} disabled={isLoading} className="rounded-xl border-slate-200 dark:border-slate-800">
                        <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                        Atualizar
                    </Button>
                    <Button onClick={handleCreateBackup} disabled={isCreating} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl px-6">
                        {isCreating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                        Gerar Backup Agora
                    </Button>
                </div>
            </div>

            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-none shadow-md hover:shadow-lg transition-all cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total de Backups</CardTitle>
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Database className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{backups.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Máximo de 10 arquivos (rotação ativa)</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-none shadow-md hover:shadow-lg transition-all cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Espaço Utilizado</CardTitle>
                        <div className="p-2 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg">
                            <HardDrive className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatSize(totalSize)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Armazenamento local em disco</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-none shadow-md hover:shadow-lg transition-all cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Última Cópia</CardTitle>
                        <div className="p-2 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold truncate">
                            {lastBackup ? lastBackup.toLocaleDateString() : 'Nenhum'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {lastBackup ? lastBackup.toLocaleTimeString() : 'Nenhum backup encontrado'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-none shadow-md hover:shadow-lg transition-all cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Integridade</CardTitle>
                        <div className="p-2 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-lg">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">Saudável</div>
                        <p className="text-xs text-muted-foreground mt-1">Monitoramento de banco ativo</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 overflow-hidden border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Gestão de Snapshots</CardTitle>
                                <CardDescription>Lista detalhada de cópias de segurança locais.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex justify-center p-12"><RefreshCw className="animate-spin h-8 w-8 text-primary" /></div>
                        ) : backups.length === 0 ? (
                            <div className="text-center py-20">
                                <Clock className="h-16 w-16 mx-auto text-muted-foreground opacity-10" />
                                <p className="mt-4 text-muted-foreground font-medium">Inicie seu primeiro backup para começar.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Arquivo</th>
                                            <th className="px-6 py-4">Tamanho</th>
                                            <th className="px-6 py-4">Data de Criação</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {backups.map((backup) => (
                                            <tr key={backup.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-blue-100/30 dark:bg-blue-900/10 flex items-center justify-center text-blue-500">
                                                            <HardDrive className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{backup.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-500">
                                                    {formatSize(backup.size)}
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {new Date(backup.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 pr-2">
                                                        <a href={`/api/sistema/manutencao/download?name=${encodeURIComponent(backup.name)}`} download={backup.name}>
                                                            <Button variant="ghost" size="sm" className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg">
                                                                <Download className="h-3.5 w-3.5 mr-2" /> Baixar
                                                            </Button>
                                                        </a>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg">
                                                                    <RefreshCw className="h-3.5 w-3.5 mr-2" /> Restaurar
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="rounded-2xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                                                        <AlertTriangle className="h-5 w-5" /> Confirmar Restauração?
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-base">
                                                                        Esta ação irá sobrescrever o banco de dados atual com os dados deste backup.
                                                                        O sistema será reiniciado automaticamente. **ESTA AÇÃO É IRREVERSÍVEL.**
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleRestore(backup.name)} className="bg-destructive hover:bg-destructive/90 rounded-xl px-6">
                                                                        Sim, Restaurar Agora
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>

                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg" onClick={() => handleDelete(backup.name)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Recomendações
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 text-sm">
                                <p className="font-bold text-amber-800 dark:text-amber-400 mb-1">Ciclagem de Arquivos</p>
                                <p className="text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                                    Apenas os 10 últimos backups são mantidos. Baixe arquivos importantes para armazenamento em nuvem ou externo.
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-sm">
                                <p className="font-bold text-blue-800 dark:text-blue-400 mb-1">Restauração Instantânea</p>
                                <p className="text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
                                    Para ambientes SQLite, a restauração é processada em segundos. Outros bancos requerem importação via CLI.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-2xl bg-primary text-primary-foreground overflow-hidden relative group rounded-2xl">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Database className="h-24 w-24" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-lg">Dica Técnica</CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <p className="text-sm opacity-90 leading-relaxed">
                                Agende backups automáticos no seu servidor Host/VPS utilizando o cron:
                            </p>
                            <div className="mt-3 p-3 bg-black/20 rounded-xl font-mono text-[10px] break-all border border-white/10 uppercase tracking-tighter">
                                npm run backup
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
