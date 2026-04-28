"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  MessageSquare, Save, ChevronLeft, Shield, Globe, 
  Settings, Key, Smartphone, ExternalLink, CheckCircle2, 
  XCircle, Zap, RefreshCw, AlertCircle 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function WhatsAppConfigPage() {
  const params = useParams();
  const base = `/${params.orgSlug}`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    apiUrl: "",
    globalApiKey: "",
    instanceName: "",
    token: "",
    isActive: false,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/sistema/whatsapp");
      if (response.ok) {
        const data = await response.json();
        if (data.id) {
          setConfig({
            apiUrl: data.apiUrl || "",
            globalApiKey: data.globalApiKey || "",
            instanceName: data.instanceName || "",
            token: data.token || "",
            isActive: data.isActive || false,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/sistema/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success("Configurações salvas com sucesso!");
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.apiUrl || !config.globalApiKey) {
      toast.error("Preencha a URL e a API Key Global para testar");
      return;
    }

    setTesting(true);
    try {
      // Simulação de teste com a Evolution API
      const response = await fetch(`${config.apiUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': config.globalApiKey
        }
      });
      
      if (response.ok) {
        toast.success("Conexão com Evolution API realizada com sucesso!");
      } else {
        toast.error("Falha na conexão. Verifique os dados e o CORS.");
      }
    } catch (error) {
      toast.error("Erro de rede ao tentar conectar com a API");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href={`${base}/configuracoes`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar para Configurações
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Evolution API (WhatsApp)</h1>
          </div>
          <p className="text-muted-foreground">Configurações de integração com o módulo oficial do WhatsApp.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={testConnection} 
            disabled={testing || saving}
            className="gap-2"
          >
            {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {testing ? "Testando..." : "Testar Conexão"}
          </Button>
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Main Config */}
        <div className="md:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Parâmetros da API
                  </CardTitle>
                  <CardDescription>
                    Configure os dados de acesso à sua instância da Evolution API.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="active-switch" className="text-sm cursor-pointer">
                    Módulo {config.isActive ? "Ativo" : "Inativo"}
                  </Label>
                  <Switch
                    id="active-switch"
                    checked={config.isActive}
                    onCheckedChange={(checked) => setConfig({ ...config, isActive: checked })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl" className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    URL da API
                  </Label>
                  <Input
                    id="apiUrl"
                    placeholder="https://sua-evolution-api.com"
                    value={config.apiUrl}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Ex: https://evolution-api.dominio.com
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instanceName" className="flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                    Nome da Instância
                  </Label>
                  <Input
                    id="instanceName"
                    placeholder="Ex: NextWave_Instancia"
                    value={config.instanceName}
                    onChange={(e) => setConfig({ ...config, instanceName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="globalApiKey" className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    API Key Global
                  </Label>
                  <div className="relative">
                    <Input
                      id="globalApiKey"
                      type="password"
                      placeholder="Chave Global da Evolution API"
                      value={config.globalApiKey}
                      onChange={(e) => setConfig({ ...config, globalApiKey: e.target.value })}
                      className="pr-10"
                    />
                    <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token" className="flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                    Token de Bot (Opcional)
                  </Label>
                  <Input
                    id="token"
                    placeholder="Token da Instância"
                    value={config.token}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Guia de Integração
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-muted-foreground">
              <p>O NextWave CRM integra-se de forma nativa com a Evolution API para:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Envio automático de mensagens de cobrança</li>
                <li>Chat em tempo real integrado ao dashboard</li>
                <li>Automação de fluxos de atendimento (Chatbot)</li>
                <li>Notificações de sistema e alertas</li>
              </ul>
              <div className="pt-2">
                <Button variant="link" className="h-auto p-0 gap-2 text-emerald-600 dark:text-emerald-400" asChild>
                  <a href="https://doc.evolution-api.com" target="_blank" rel="noopener noreferrer">
                    Ver Documentação Oficial <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-md">Status do Módulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Integração</span>
                <Badge variant={config.isActive ? "success" : "destructive"}>
                  {config.isActive ? "ATIVA" : "INATIVA"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm">Versão API</span>
                <span className="text-sm font-semibold italic">v2.x (Recomendado)</span>
              </div>
              
              {!config.isActive && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p className="text-xs">
                    Com o módulo inativo, as automações de WhatsApp e o Chat não funcionarão.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-md">Dica de Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nunca compartilhe sua <strong>API Key Global</strong>. Ela dá acesso total ao seu servidor Evolution API.
                Recomendamos sempre utilizar HTTPS (SSL) na URL da API para garantir que os dados trafeguem de forma criptografada.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
