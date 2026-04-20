"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, ShieldCheck, UserPlus, CheckCircle2, Loader2, ArrowRight, ChevronLeft, Database, Users, DollarSign, Briefcase, Calendar, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { SYSTEM_INFO } from "@/lib/constants";


const setupSchema = z.object({
    // Step: URL do sistema
    siteUrl: z.string().url("URL inválida. Ex: http://192.168.0.10:3010").min(1, "URL obrigatória"),
    // Step: Identidade
    orgName: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
    orgSlug: z.string().min(2, "Slug deve ter no mínimo 2 caracteres").regex(/^[a-z0-9-]+$/, "Slug inválido (apenas minúsculas, números e hífens)"),
    // Step: Admin
    name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    confirmPassword: z.string(),
    // Step: Security
    allowedIps: z.string().optional(),
    workDayStart: z.string().optional(),
    workDayEnd: z.string().optional(),
    // Step: Database
    dbHost: z.string().min(1, "Host do banco é obrigatório"),
    dbPort: z.string().min(1, "Porta é obrigatória"),
    dbUser: z.string().min(1, "Usuário é obrigatório"),
    dbPassword: z.string().min(1, "Senha é obrigatória"),
    dbName: z.string().min(1, "Nome do banco é obrigatório"),
    dbUrl: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

type SetupForm = z.infer<typeof setupSchema>;

export default function SetupPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [backupData, setBackupData] = useState<{ data: string, name: string } | null>(null);
    const [wasRestored, setWasRestored] = useState(false);
    const [selectedModules, setSelectedModules] = useState<string[]>([
        "clientes", "financeiro", "projetos", "servicos", "agenda", "usuarios"
    ]);

    const availableModules = [
        { key: "clientes", label: "Clientes", icon: Users },
        { key: "financeiro", label: "Financeiro", icon: DollarSign },
        { key: "projetos", label: "Projetos (Kanban)", icon: Briefcase },
        { key: "servicos", label: "Serviços", icon: Database },
        { key: "agenda", label: "Agenda", icon: Calendar },
        { key: "whatsapp", label: "WhatsApp Chat", icon: Zap },
    ];

    useEffect(() => {
        async function checkStatus() {
            try {
                const res = await fetch("/api/setup");
                const data = await res.json();
                if (data.isConfigured) {
                    window.location.href = "/login";
                }
            } catch (error) {
                console.error("Erro ao verificar status", error);
            } finally {
                setIsChecking(false);
            }
        }
        checkStatus();
    }, [router]);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<SetupForm>({
        resolver: zodResolver(setupSchema),
        defaultValues: {
            siteUrl: typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "",
            orgName: "Minha Empresa",
            orgSlug: "minha-empresa",
            allowedIps: "*",
            workDayStart: "08:00",
            workDayEnd: "18:00",
        }
    });

    const [dbTestStatus, setDbTestStatus] = useState<"none" | "testing" | "success" | "error">("none");

    const testDbConnection = async () => {
        const values = watch();
        setDbTestStatus("testing");
        try {
            const response = await fetch("/api/setup/test-connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbHost: values.dbHost,
                    dbPort: values.dbPort,
                    dbUser: values.dbUser,
                    dbPassword: values.dbPassword,
                    dbName: values.dbName,
                }),
            });

            const result = await response.json();
            if (response.ok) {
                setDbTestStatus("success");
                toast.success("Conexão estabelecida com sucesso!");
            } else {
                setDbTestStatus("error");
                toast.error(result.error || "Falha ao conectar no banco.");
            }
        } catch (error) {
            setDbTestStatus("error");
            toast.error("Erro ao testar conexão.");
        }
    };

    const onSubmit = async (data: SetupForm) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgName: data.orgName,
                    orgSlug: data.orgSlug,
                    siteUrl: data.siteUrl,
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    allowedIps: data.allowedIps,
                    workDayStart: data.workDayStart,
                    workDayEnd: data.workDayEnd,
                    dbConfig: {
                        host: data.dbHost,
                        port: data.dbPort,
                        user: data.dbUser,
                        password: data.dbPassword,
                        database: data.dbName,
                    },
                    modules: selectedModules,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                toast.success("Sistema configurado com sucesso!");
                setStep(6);
            } else {
                toast.error(result.error || "Erro ao configurar sistema");
            }
        } catch (error) {
            toast.error("Erro na comunicação com o servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    const onRestoreBackup = async () => {
        if (!backupData) return;
        setIsLoading(true);
        try {
            const response = await fetch("/api/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    backupData: backupData.data,
                    backupName: backupData.name,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                toast.success(result.message || "Backup restaurado com sucesso!");
                setWasRestored(true);
                setStep(6);
            } else {
                toast.error(result.error || "Erro ao restaurar backup");
            }
        } catch (error) {
            toast.error("Erro na comunicação com o servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalSteps = 6;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Background patterns */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
            </div>

            <div className="flex-1 flex items-center justify-center p-4 relative z-10">
                <div className="w-full max-w-xl space-y-8 animate-in delay-150 duration-700 fade-in slide-in-from-bottom-4">

                    {/* Header */}
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 shadow-xl shadow-primary/20">
                            <Zap className="h-8 w-8 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                                Configuração Inicial
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-lg">
                                Wizard de Segurança e Performance NextWave
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-4 px-4 sm:px-12">
                        <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
                            <span>Passo {step} de {totalSteps}</span>
                            <span>{Math.round((step / totalSteps) * 100)}% concluído</span>
                        </div>
                        <Progress value={(step / totalSteps) * 100} className="h-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="flex justify-between gap-1 px-2">
                            {Array.from({ length: totalSteps }).map((_, i) => (
                                <div key={i} className={`h-1.5 flex-1 rounded-full ${step > i ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Wizard Card */}
                    <Card className="border-0 shadow-2xl shadow-slate-200 dark:shadow-slate-900/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                                {step === 1 && <ShieldCheck className="h-6 w-6 text-primary" />}
                                {step === 2 && <Zap className="h-6 w-6 text-primary" />}
                                {step === 3 && <ShieldCheck className="h-6 w-6 text-primary" />}
                                {step === 4 && <UserPlus className="h-6 w-6 text-primary" />}
                                {step === 5 && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                            </div>
                            <CardTitle className="text-xl">
                                {step === 1 && "Verificação de Ambiente"}
                                {step === 2 && "Personalização do Sistema"}
                                {step === 3 && "Configuração de Banco de Dados"}
                                {step === 4 && "Restrições de Segurança"}
                                {step === 5 && "Cadastro de Administrador Master"}
                                {step === 6 && "Configuração Finalizada!"}
                            </CardTitle>
                            <CardDescription>
                                {step === 1 && "O ambiente foi detectado e o servidor está disponível."}
                                {step === 2 && "Escolha quais funcionalidades deseja ativar agora."}
                                {step === 3 && "Configure o local onde seus dados serão armazenados."}
                                {step === 4 && "Defina regras de acesso por IP e horário de trabalho."}
                                {step === 5 && "Crie sua conta master com super-poderes administrativos."}
                                {step === 6 && "Seu ambiente NextWave está proto e seguro."}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pt-6 sm:px-10">
                                <div className={cn("space-y-6 animate-in fade-in duration-500", step !== 1 && "hidden")}>
                                    <div className="space-y-4">
                                        {[
                                            { label: "Engine CRM", status: "Instalado" },
                                            { label: "Sessão e JWT", status: "Pronto" },
                                            { label: "Permissões de Escrita", status: "OK" },
                                        ].map((item) => (
                                            <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">{item.label}</span>
                                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    {item.status}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <Label htmlFor="siteUrl" className="flex items-center gap-2 font-semibold">
                                            <Globe className="h-4 w-4 text-primary" />
                                            URL de Acesso do Sistema
                                        </Label>
                                        <Input
                                            id="siteUrl"
                                            placeholder="Ex: http://192.168.0.10:3010 ou https://crm.empresa.com"
                                            {...register("siteUrl")}
                                        />
                                        {errors.siteUrl && <p className="text-xs text-destructive">{errors.siteUrl.message}</p>}
                                        <p className="text-[11px] text-muted-foreground">
                                            Endereço pelo qual os usuários acessarão o sistema. Usado para autenticação e redirecionamentos.
                                        </p>
                                    </div>

                                    <Button onClick={() => setStep(2)} className="w-full h-12 text-md transition-all hover:gap-3" size="lg">
                                        Continuar para Personalização <ArrowRight className="h-5 w-5" />
                                    </Button>
                                </div>

                                <div className={cn("space-y-6 animate-in fade-in duration-500", step !== 2 && "hidden")}>
                                    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="space-y-2">
                                            <Label htmlFor="orgName" className="font-semibold text-sm">Nome da sua Empresa</Label>
                                            <Input id="orgName" placeholder="Ex: NextWave Solutions" {...register("orgName")} />
                                            {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="orgSlug" className="font-semibold text-sm">Identificador (URL Slug)</Label>
                                            <Input 
                                                id="orgSlug" 
                                                placeholder="ex: nextwave-solutions" 
                                                {...register("orgSlug")} 
                                                onChange={e => {
                                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                                    e.target.value = val;
                                                }}
                                            />
                                            {errors.orgSlug && <p className="text-xs text-destructive">{errors.orgSlug.message}</p>}
                                            <p className="text-[10px] text-muted-foreground">Isso definirá seu link: crm.com/<b>identificador</b></p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {availableModules.map((mod) => {
                                            const Icon = mod.icon;
                                            const isSelected = selectedModules.includes(mod.key);
                                            return (
                                                <button
                                                    key={mod.key}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedModules(prev => prev.filter(k => k !== mod.key));
                                                        } else {
                                                            setSelectedModules(prev => [...prev, mod.key]);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                                        isSelected
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200"
                                                    )}
                                                >
                                                    <Icon className="h-5 w-5" />
                                                    <span className="text-xs font-semibold">{mod.label}</span>
                                                    <div className={cn(
                                                        "h-2 w-2 rounded-full",
                                                        isSelected ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
                                                    )} />
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setStep(1)} className="h-12 w-14">
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <Button onClick={() => setStep(3)} className="flex-1 h-12 text-md" size="lg">
                                            Próximo: Banco de Dados <ArrowRight className="h-5 w-5 ml-2" />
                                        </Button>
                                    </div>
                                </div>

                                <div className={cn("space-y-6 animate-in fade-in duration-500", step !== 3 && "hidden")}>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="dbHost">Servidor (Host)</Label>
                                                <Input id="dbHost" placeholder="Ex: localhost ou db" {...register("dbHost")} />
                                                {errors.dbHost && <p className="text-xs text-destructive">{errors.dbHost.message}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="dbPort">Porta</Label>
                                                <Input id="dbPort" placeholder="Ex: 5432" defaultValue="5432" {...register("dbPort")} />
                                                {errors.dbPort && <p className="text-xs text-destructive">{errors.dbPort.message}</p>}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="dbName">Nome do Banco de Dados</Label>
                                            <Input id="dbName" placeholder="Ex: nextwave_crm" {...register("dbName")} />
                                            {errors.dbName && <p className="text-xs text-destructive">{errors.dbName.message}</p>}
                                        </div>

                                        <hr className="border-slate-100 dark:border-slate-800" />

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="dbUser">Usuário do Banco</Label>
                                                <Input id="dbUser" placeholder="Ex: root" {...register("dbUser")} />
                                                {errors.dbUser && <p className="text-xs text-destructive">{errors.dbUser.message}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="dbPassword">Senha do Banco</Label>
                                                <Input id="dbPassword" type="password" placeholder="••••••••" {...register("dbPassword")} />
                                                {errors.dbPassword && <p className="text-xs text-destructive">{errors.dbPassword.message}</p>}
                                            </div>
                                        </div>

                                        <Button 
                                            type="button" 
                                            variant="secondary" 
                                            className={cn(
                                                "w-full h-10 text-sm font-semibold",
                                                dbTestStatus === "success" && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                                                dbTestStatus === "error" && "bg-red-100 text-red-700 hover:bg-red-100"
                                            )}
                                            onClick={testDbConnection}
                                            disabled={dbTestStatus === "testing"}
                                        >
                                            {dbTestStatus === "testing" ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Testando...</> : 
                                             dbTestStatus === "success" ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Conexão OK!</> :
                                             dbTestStatus === "error" ? "Falha na Conexão. Tentar Novamente?" :
                                             "Testar Conexão com o Banco"}
                                        </Button>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setStep(2)} className="h-12 w-14">
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <Button onClick={() => setStep(4)} className="flex-1 h-12 text-md" size="lg" disabled={dbTestStatus !== "success"}>
                                            Próximo: Segurança <ArrowRight className="h-5 w-5 ml-2" />
                                        </Button>
                                    </div>
                                </div>

                                <div className={cn("space-y-6 animate-in fade-in duration-500", step !== 4 && "hidden")}>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="allowedIps">IPs Permitidos (Separados por vírgula)</Label>
                                            <Input id="allowedIps" placeholder="Ex: 177.91.165.246 ou * para todos" {...register("allowedIps")} />
                                            <p className="text-[10px] text-muted-foreground">Seu IP atual será detectado automaticamente como padrão se deixar vazio.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="workDayStart">Início do Turno</Label>
                                                <Input id="workDayStart" type="time" {...register("workDayStart")} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="workDayEnd">Fim do Turno</Label>
                                                <Input id="workDayEnd" type="time" {...register("workDayEnd")} />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                            <ShieldCheck className="h-5 w-5 text-amber-600" />
                                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                                O acesso fora do horário ou IP será bloqueado pelo Gateway de Autenticação.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setStep(3)} className="h-12 w-14">
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <Button onClick={() => setStep(5)} className="flex-1 h-12 text-md" size="lg">
                                            Próximo Passo <ArrowRight className="h-5 w-5 ml-2" />
                                        </Button>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-5 animate-in fade-in duration-500", step !== 5 && "hidden")}>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo</Label>
                                        <Input id="name" placeholder="Ex: João Silva" {...register("name")} />
                                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Administrativo</Label>
                                        <Input id="email" type="email" placeholder="email@dominio.com" {...register("email")} />
                                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Senha Forte</Label>
                                            <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
                                            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirmação</Label>
                                            <Input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} />
                                            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button type="button" variant="outline" onClick={() => setStep(4)} className="h-12 w-14">
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <Button type="submit" className="flex-1 h-12 text-md" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                    Finalizando Setup...
                                                </>
                                            ) : (
                                                "Concluir Instalação"
                                            )}
                                        </Button>
                                    </div>
                                </form>

                            {step === 6 && (
                                <div className="text-center space-y-8 animate-in zoom-in-95 duration-700">
                                    <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                                        <p className="text-slate-600 dark:text-slate-400">
                                            {wasRestored
                                                ? "Backup restaurado com sucesso! Faça login com suas credenciais anteriores."
                                                : "Parabéns! O seu CRM está configurado com camadas extras de segurança por IP e Horário. Suas credenciais master foram salvas."
                                            }
                                        </p>
                                    </div>
                                    <Button onClick={() => window.location.href = "/login"} className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700" size="lg">
                                        Acessar CRM Seguro
                                    </Button>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="justify-center border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-4 rounded-b-xl">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                NextWave v{SYSTEM_INFO.version} • {SYSTEM_INFO.securityGateway} Gateway Enabled
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <div className="p-8 text-center relative z-10">
                <p className="text-sm text-slate-500">
                    © 2026 NextWave CRM • Assistente de Configuração Master
                </p>
            </div>
        </div>
    );
}
