"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Smartphone, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function SecurityPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secret, setSecret] = useState("");
    const [token, setToken] = useState("");
    const [isEnabled, setIsEnabled] = useState(false);

    const handleStartSetup = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
            const data = await res.json();
            setQrCode(data.qrCode);
            setSecret(data.secret);
            setStep(2);
        } catch (error) {
            toast.error("Erro ao iniciar configuração de 2FA");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyToken = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, secret })
            });

            if (res.ok) {
                toast.success("2FA ativado com sucesso!");
                setIsEnabled(true);
                setStep(3);
            } else {
                toast.error("Código inválido. Tente novamente.");
            }
        } catch (error) {
            toast.error("Erro ao verificar código");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight theme-title">Segurança</h1>
                <p className="text-muted-foreground text-sm">Proteja sua conta com camadas extras de autenticação.</p>
            </div>

            <Card className="kpi-card">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle>Autenticação de Dois Fatores (2FA)</CardTitle>
                            <CardDescription>Adicione uma camada extra de segurança usando um app autenticador.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    {step === 1 && (
                        <div className="flex flex-col items-center gap-6 py-4 text-center">
                            <Smartphone className="h-16 w-16 text-muted-foreground/30" />
                            <div className="space-y-2">
                                <h3 className="font-bold text-lg">Habilitar camada extra?</h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    Ao ativar, você precisará de um código do seu celular toda vez que fizer login.
                                </p>
                            </div>
                            <Button onClick={handleStartSetup} loading={loading} className="w-full max-w-xs">
                                Configurar Agora <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {step === 2 && qrCode && (
                        <div className="space-y-6 py-4">
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="p-4 bg-white border rounded-xl shadow-sm">
                                    <Image src={qrCode} alt="QR Code 2FA" width={180} height={180} />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-1">
                                        <Label>1. Escaneie o QR Code</Label>
                                        <p className="text-xs text-muted-foreground">Use Google Authenticator, Authy ou similar.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>2. Digite o código de 6 dígitos</Label>
                                        <Input
                                            placeholder="000 000"
                                            value={token}
                                            onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                            className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                                        />
                                    </div>
                                    <Button onClick={handleVerifyToken} loading={loading} className="w-full">
                                        Verificar e Ativar
                                    </Button>
                                </div>
                            </div>
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3 text-amber-600">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <p className="text-[10px] leading-relaxed">
                                    Manual: {secret} <br />
                                    Guarde este código em local seguro. Se perder o celular, você precisará dele para recuperar o acesso.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center gap-4 py-8 text-center text-success">
                            <div className="p-4 bg-success/10 rounded-full">
                                <CheckCircle2 className="h-12 w-12" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-xl">2FA Ativado!</h3>
                                <p className="text-sm text-muted-foreground">Sua conta agora está muito mais protegida.</p>
                            </div>
                            <Button variant="outline" onClick={() => setStep(1)} className="mt-4">
                                Voltar
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
