"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Shield, Save, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const params = useParams();
    const base = `/${params.orgSlug}`;
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(session?.user?.name || "");
    const [email, setEmail] = useState(session?.user?.email || "");

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/sistema/perfil", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email })
            });

            if (res.ok) {
                await update({ name, email });
                toast.success("Perfil atualizado com sucesso!");
            } else {
                throw new Error();
            }
        } catch (error) {
            toast.error("Erro ao atualizar perfil");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight theme-title">Meu Perfil</h1>
                <p className="text-muted-foreground text-sm">Gerencie suas informações pessoais e segurança da conta.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 kpi-card">
                    <CardHeader>
                        <CardTitle>Dados Pessoais</CardTitle>
                        <CardDescription>Estes são os dados que os outros usuários verão e que você usa para login.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="perf-name">Nome Completo</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="perf-name"
                                    className="pl-9"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="perf-email">E-mail</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="perf-email"
                                    type="email"
                                    className="pl-9"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Alterações
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 text-primary font-bold">
                                <Shield className="h-4 w-4" />
                                <span>Segurança</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-muted-foreground">Recomendamos ativar a autenticação de dois fatores (2FA) para maior proteção.</p>
                            <Link href={`${base}/configuracoes/seguranca`}>
                                <Button variant="outline" size="sm" className="w-full group">
                                    Configurar 2FA
                                    <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Status da Conta</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-medium">Ativa e Protegida</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
