"use client";

import { useState, useEffect } from "react";
import { 
  GitBranch, 
  RefreshCw, 
  Terminal, 
  History, 
  ChevronRight, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Package,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import versions from "@/data/versions.json";
import { cn } from "@/lib/utils";

export default function AtualizacoesPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ type: 'info' | 'error' | 'success', text: string }[]>([]);
  const currentVersion = versions[0];

  const addLog = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, { type, text: `[${new Date().toLocaleTimeString()}] ${text}` }]);
  };

  const runUpdate = async (cmd: string, label: string) => {
    setLoading(cmd);
    addLog(`Iniciando: ${label}...`);
    try {
      const res = await fetch("/api/sistema/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      
      if (data.stdout) addLog(data.stdout);
      if (data.stderr) addLog(data.stderr, 'error');

      if (data.success) {
        addLog(`${label} concluído com sucesso!`, 'success');
        toast.success(`${label} finalizado.`);
      } else {
        addLog(`Erro em ${label}: ${data.error}`, 'error');
        toast.error(`Erro em ${label}`);
      }
    } catch (error: any) {
      addLog(`Falha na requisição: ${error.message}`, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Versões & Atualizações</h1>
          <p className="text-muted-foreground mt-1">Gerencie a versão do sistema e veja o histórico de mudanças</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <GitBranch className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-primary">v{currentVersion.version}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <History className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Linha do Tempo</CardTitle>
                <CardDescription>Histórico de atualizações e novas funcionalidades</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {versions.map((v, i) => (
                  <div key={v.version} className="relative flex items-start gap-6 group">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white dark:border-slate-900 shadow-md transition-all group-hover:scale-110",
                      i === 0 ? "bg-primary text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-800"
                    )}>
                      {i === 0 ? <CheckCircle2 className="h-5 w-5" /> : <Package className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{v.title}</h3>
                          <Badge variant={v.type === 'feature' ? 'success' : 'info'} className="text-[10px] rounded-full px-2">
                            {v.type}
                          </Badge>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{v.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {v.changes.map((c, j) => (
                          <li key={j} className="text-xs flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <ChevronRight className="h-3 w-3 text-primary" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lado Direito: Ações e Console */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm">Central de Comando</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {[
                { id: 'pull', label: 'Buscar Atualizações', icon: RefreshCw, desc: 'Executa git pull' },
                { id: 'reset', label: 'Limpar Alterações Locais', icon: AlertCircle, desc: 'Resolve erros de git checkout' },
                { id: 'install', label: 'Instalar Dependências', icon: Download, desc: 'Executa npm install' },
                { id: 'generate', label: 'Gerar Prisma Client', icon: Package, desc: 'Atualiza o ORM' },
                { id: 'push', label: 'Sincronizar Banco de Dados', icon: ShieldCheck, desc: 'Aplica migrations' },
                { id: 'build', label: 'Reconstruir Sistema', icon: Terminal, desc: 'Build de produção' },
              ].map((btn) => (
                <Button 
                  key={btn.id}
                  variant="outline" 
                  className="w-full justify-start h-auto py-3 px-4 hover:bg-primary/10 transition-all border-primary/10"
                  disabled={loading !== null}
                  onClick={() => runUpdate(btn.id, btn.label)}
                >
                  <div className="flex items-center gap-3 text-left w-full">
                    {loading === btn.id ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <btn.icon className="h-5 w-5 text-primary" />}
                    <div>
                      <p className="font-bold text-xs">{btn.label}</p>
                      <p className="text-[10px] text-muted-foreground font-normal">{btn.desc}</p>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800 h-[400px] flex flex-col overflow-hidden shadow-2xl">
            <CardHeader className="p-3 border-b border-white/5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-[10px] text-white uppercase tracking-widest font-black">System Console</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500" onClick={() => setLogs([])}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 opacity-20">
                    <Terminal className="h-8 w-8 text-white mb-2" />
                    <p className="text-[10px] text-white uppercase font-bold">Aguardando comandos...</p>
                  </div>
                ) : (
                  <div className="space-y-1 font-mono">
                    {logs.map((log, i) => (
                      <p key={i} className={cn(
                        "text-[10px] break-all",
                        log.type === 'error' ? "text-red-400" : log.type === 'success' ? "text-emerald-400" : "text-slate-300"
                      )}>
                        {log.text}
                      </p>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
