"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Monitor, User, Bell, Shield, Palette, Puzzle, Mail, Phone, DollarSign, CreditCard, Server, MessageSquare, History as HistoryIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [notificacoes, setNotificacoes] = useState({
    notifyEmail: true,
    notifyPush: false,
    notifyDue: true,
  });

  const [loadingConfig, setLoadingConfig] = useState(false);

  // Carregar preferências do banco no primeiro acesso
  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/configuracoes/perfil")
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setNotificacoes({
              notifyEmail: data.user.notifyEmail ?? true,
              notifyPush: data.user.notifyPush ?? false,
              notifyDue: data.user.notifyDue ?? true,
            });
          }
        })
        .catch(console.error);
    }
  }, [session?.user?.id]);

  // Função para salvar qualquer alteração de notificação
  const handleNotificacaoChange = async (key: keyof typeof notificacoes, value: boolean) => {
    setNotificacoes((prev) => ({ ...prev, [key]: value }));
    try {
      const res = await fetch("/api/configuracoes/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
      if (!res.ok) throw new Error();
      toast.success("Preferência atualizada!");
    } catch {
      toast.error("Erro ao salvar preferência");
      // Reverte em caso de erro
      setNotificacoes((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const temas = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <div className="space-y-6 max-w-3xl animate-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas preferências e configurações do sistema</p>
      </div>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Informações do Perfil</CardTitle>
          </div>
          <CardDescription>Suas informações de conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input defaultValue={session?.user?.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input defaultValue={session?.user?.email ?? ""} disabled />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">Admin</Badge>
            <span className="text-sm text-muted-foreground">Perfil de administrador</span>
          </div>
          <Button onClick={() => toast.info("Salvamento de perfil será implementado em breve.")}>
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      {/* Tema */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Aparência</CardTitle>
          </div>
          <CardDescription>Escolha o tema da interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {temas.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  )}
                >
                  <Icon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                    {t.label}
                  </span>
                  {isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Notificações</CardTitle>
          </div>
          <CardDescription>Configure como deseja receber alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "notifyEmail", label: "Notificações por Email", desc: "Receba alertas no seu email cadastrado" },
            { key: "notifyPush", label: "Notificações Push", desc: "Alertas no navegador em tempo real" },
            { key: "notifyDue", label: "Alertas de Vencimento", desc: "Avise quando transações estão próximas do vencimento" },
          ].map(({ key, label, desc }, i, arr) => (
            <div key={key}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={notificacoes[key as keyof typeof notificacoes]}
                  onCheckedChange={(v) => handleNotificacaoChange(key as keyof typeof notificacoes, v)}
                />
              </div>
              {i < arr.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Segurança</CardTitle>
          </div>
          <CardDescription>Gerencie sua senha e segurança da conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Senha Atual</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>Confirmar Nova Senha</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <Button onClick={() => toast.info("Troca de senha será implementada em breve.")}>
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      {/* Recursos Adicionais */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mt-8">Recursos Adicionais</h2>
          <p className="text-muted-foreground">Configure módulos extras e serviços de integração.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/configuracoes/modulos">
            <Card className="hover:border-primary/50 transition-colors group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Módulos do Sistema</CardTitle>
                  <CardDescription>Ative ou desative recursos do seu CRM.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/configuracoes/smtp">
            <Card className="hover:border-primary/50 transition-colors group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">E-mail (SMTP)</CardTitle>
                  <CardDescription>Configure o servidor de saída para e-mails.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/configuracoes/seguranca">
            <Card className="hover:border-primary/50 transition-colors group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Segurança & 2FA</CardTitle>
                  <CardDescription>Proteja sua conta com dois fatores.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/configuracoes/nfe">
            <Card className="hover:border-primary/50 transition-colors group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Puzzle className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Notas Fiscais (NFE)</CardTitle>
                  <CardDescription>Configurar rotinas de emissão em lote.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* WhatsApp API */}
          <Link href="/configuracoes/whatsapp">
            <Card className="hover:border-primary/50 transition-colors group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">WhatsApp API</CardTitle>
                  <CardDescription>Configure a Evolution API para automações e chat em tempo real.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/configuracoes/mcp">
            <Card className="hover:border-primary/50 transition-colors group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">MCP Server</CardTitle>
                  <CardDescription>Integre com agentes de IA via Model Context Protocol.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/configuracoes/atualizacoes">
            <Card className="hover:border-primary/50 transition-colors group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <HistoryIcon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Versões & Atualizações</CardTitle>
                  <CardDescription>Veja o histórico e instale novas atualizações via web.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/configuracoes/pbx">
            <Card className="hover:border-primary/50 transition-colors group">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">PBX & Telefonia</CardTitle>
                  <CardDescription>Configure provedores Twilio ou SIP manualmente.</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/configuracoes/pagamentos">
            <Card className="hover:bg-muted/50 transition-all border-purple-500/10 hover:border-purple-500/30 cursor-pointer shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">Gateways de Pagamento</p>
                  <p className="text-xs text-muted-foreground truncate">InfinitePay, Mercado Pago e outros</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {session?.user?.role === "master" && (
            <Link href="/configuracoes/whitelabel">
              <Card className="hover:border-primary/50 border-primary/20 bg-primary/5 transition-colors group">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary text-white transition-colors">
                    <Palette className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">White-Label & Licença</CardTitle>
                    <CardDescription>Gerencie a marca e o status desta instância.</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
