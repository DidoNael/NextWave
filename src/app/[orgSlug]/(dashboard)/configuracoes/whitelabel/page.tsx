"use client";

import { useState, useEffect } from "react";
import { Palette, ShieldAlert, CheckCircle2, Save, Loader2, Globe, Mail, Phone, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function WhiteLabelPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [branding, setBranding] = useState({
        name: "NextWave CRM",
        supportEmail: "",
        supportPhone: "",
        primaryColor: "#3b82f6"
    });
    const [license, setLicense] = useState({
        status: "active",
        customerName: "",
        validUntil: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/sistema/whitelabel");
            const data = await res.json();
            if (data.branding) setBranding(data.branding);
            if (data.license) setLicense(data.license);
        } catch (error) {
            toast.error("Erro ao carregar dados.");
        } finally {
            setIsLoading(false);
        }
    };

    const saveBranding = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/sistema/whitelabel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branding })
            });
            if (res.ok) toast.success("Marca atualizada com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar marca.");
        } finally {
            setIsSaving(false);
        }
    };

    const saveLicense = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/sistema/whitelabel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ license })
            });
            if (res.ok) toast.success("Licença atualizada!");
        } catch (error) {
            toast.error("Erro ao salvar licença.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl animate-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Palette className="h-6 w-6 text-primary" />
                    Configurações White-Label & Master
                </h1>
                <p className="text-muted-foreground mt-1">Gerenciamento exclusivo para revenda e controle de instâncias.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Branding */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Globe className="h-5 w-5" /> Identidade Visual
                        </CardTitle>
                        <CardDescription>Customize o nome e contatos do sistema.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome do Sistema (Título)</Label>
                            <Input
                                value={branding.name}
                                onChange={e => setBranding({ ...branding, name: e.target.value })}
                                placeholder="Ex: MyCRM"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email de Suporte (Página de Bloqueio)</Label>
                            <Input
                                value={branding.supportEmail}
                                onChange={e => setBranding({ ...branding, supportEmail: e.target.value })}
                                placeholder="suporte@empresa.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>WhatsApp de Suporte</Label>
                            <Input
                                value={branding.supportPhone}
                                onChange={e => setBranding({ ...branding, supportPhone: e.target.value })}
                                placeholder="Ex: 5511999999999"
                            />
                        </div>
                        <Button onClick={saveBranding} disabled={isSaving} className="w-full h-11">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Marca
                        </Button>
                    </CardContent>
                </Card>

                {/* License */}
                <Card className={license.status !== "active" ? "border-destructive/30" : ""}>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5" /> Status da Licença
                        </CardTitle>
                        <CardDescription>Controle o acesso do seu cliente aqui.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Status Geral</Label>
                            <Select
                                value={license.status}
                                onValueChange={v => setLicense({ ...license, status: v })}
                            >
                                <SelectTrigger className={license.status === "suspended" ? "text-destructive font-bold" : ""}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Ativo (Normal)</SelectItem>
                                    <SelectItem value="suspended">Suspenso (Trava Sistema)</SelectItem>
                                    <SelectItem value="trial">Experimental / Trial</SelectItem>
                                    <SelectItem value="expired">Expirado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Nome do Cliente / Empresa</Label>
                            <Input
                                value={license.customerName}
                                onChange={e => setLicense({ ...license, customerName: e.target.value })}
                                placeholder="ID ou Nome do Comprador"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Válido Até (Apenas informativo por ora)</Label>
                            <Input
                                type="date"
                                value={license.validUntil ? new Date(license.validUntil).toISOString().split('T')[0] : ""}
                                onChange={e => setLicense({ ...license, validUntil: e.target.value })}
                            />
                        </div>

                        <Separator />

                        <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3">
                            <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <p className="text-xs text-muted-foreground">
                                <strong>Importante:</strong> Mudar para "Suspenso" bloqueará todas as telas do sistema para este cliente instantaneamente. Use para controle de falta de pagamento.
                            </p>
                        </div>

                        <Button onClick={saveLicense} disabled={isSaving} variant={license.status === "suspended" ? "destructive" : "default"} className="w-full h-11">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Atualizar Licença
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
