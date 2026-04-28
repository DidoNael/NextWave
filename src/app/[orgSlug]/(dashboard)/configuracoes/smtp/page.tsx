"use client";

import { useEffect, useState } from "react";
import {
    Mail, Send, Server, Trash2, Edit2,
    CheckCircle2, XCircle, RefreshCw, Save, Key, Inbox, Plus, MoreHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SmtpProfile {
    id: string;
    name: string;
    host: string;
    port: number;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string | null;
    secure: boolean;
    isActive: boolean;
    isDefault: boolean;
}

export default function SmtpSettingsPage() {
    const [profiles, setProfiles] = useState<SmtpProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Partial<SmtpProfile> | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);

    const fetchProfiles = async () => {
        try {
            const res = await fetch("/api/configuracoes/smtp");
            const data = await res.json();
            if (Array.isArray(data)) {
                // Converter booleanos do SQLite (0/1)
                const normalized = data.map(p => ({
                    ...p,
                    secure: !!p.secure,
                    isActive: !!p.isActive,
                    isDefault: !!p.isDefault
                }));
                setProfiles(normalized);
            }
        } catch (error) {
            toast.error("Erro ao carregar perfis SMTP");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveLoading(true);

        try {
            const method = editingProfile?.id ? "PATCH" : "POST";
            const url = editingProfile?.id
                ? `/api/configuracoes/smtp/${editingProfile.id}`
                : "/api/configuracoes/smtp";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingProfile),
            });

            if (res.ok) {
                toast.success(editingProfile?.id ? "Perfil atualizado!" : "Perfil criado!");
                setIsDialogOpen(false);
                fetchProfiles();
            } else {
                toast.error("Erro ao salvar perfil");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este perfil SMTP?")) return;
        try {
            const res = await fetch(`/api/configuracoes/smtp/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Perfil removido");
                fetchProfiles();
            }
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    const handleToggleDefault = async (profile: SmtpProfile) => {
        if (profile.isDefault) return;
        try {
            const res = await fetch(`/api/configuracoes/smtp/${profile.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDefault: true }),
            });
            if (res.ok) {
                toast.success(`${profile.name} definido como padrão`);
                fetchProfiles();
            }
        } catch (error) {
            toast.error("Erro ao definir padrão");
        }
    };

    return (
        <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">Canais de E-mail (SMTP)</h1>
                    </div>
                    <p className="text-muted-foreground">Gerencie seus remetentes para disparos de suporte, financeiro e marketing.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingProfile(null);
                }}>
                    <DialogTrigger asChild>
                        <Button
                            className="gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                            onClick={() => setEditingProfile({
                                name: "", host: "smtp.gmail.com", port: 587,
                                user: "", pass: "", fromEmail: "", fromName: "", secure: true
                            })}
                        >
                            <Plus className="h-4 w-4" /> Novo Perfil
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <form onSubmit={handleSave}>
                            <DialogHeader>
                                <DialogTitle>{editingProfile?.id ? "Editar Perfil SMTP" : "Novo Perfil SMTP"}</DialogTitle>
                                <DialogDescription>Configure as credenciais e o remetente para este canal.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Nome do Perfil (ex: Suporte)</Label>
                                        <Input
                                            value={editingProfile?.name || ""}
                                            onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                                            placeholder="Ex: Financeiro" required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Host SMTP</Label>
                                        <Input
                                            value={editingProfile?.host || ""}
                                            onChange={e => setEditingProfile({ ...editingProfile, host: e.target.value })}
                                            placeholder="smtp.gmail.com" required
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Porta</Label>
                                        <Input
                                            type="number"
                                            value={editingProfile?.port || 587}
                                            onChange={e => setEditingProfile({ ...editingProfile, port: parseInt(e.target.value) })}
                                            placeholder="587" required
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Usuário / E-mail de Login</Label>
                                        <Input
                                            value={editingProfile?.user || ""}
                                            onChange={e => setEditingProfile({ ...editingProfile, user: e.target.value })}
                                            placeholder="seu@email.com" required
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Senha / App Password</Label>
                                        <Input
                                            type="password"
                                            value={editingProfile?.pass || ""}
                                            onChange={e => setEditingProfile({ ...editingProfile, pass: e.target.value })}
                                            placeholder="••••••••••••••••" required
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pt-8">
                                        <Switch
                                            id="secure"
                                            checked={editingProfile?.secure}
                                            onCheckedChange={val => setEditingProfile({ ...editingProfile, secure: val })}
                                        />
                                        <Label htmlFor="secure">SSL/TLS</Label>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 border-t pt-4 mt-2">
                                    <div className="space-y-2">
                                        <Label className="text-primary">E-mail do Remetente (From)</Label>
                                        <Input
                                            value={editingProfile?.fromEmail || ""}
                                            onChange={e => setEditingProfile({ ...editingProfile, fromEmail: e.target.value })}
                                            placeholder="atendimento@suaempresa.com" required
                                        />
                                        <p className="text-[10px] text-muted-foreground">E-mail que o cliente verá ao receber.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-primary">Nome do Remetente</Label>
                                        <Input
                                            value={editingProfile?.fromName || ""}
                                            onChange={e => setEditingProfile({ ...editingProfile, fromName: e.target.value })}
                                            placeholder="Suporte - NextWave CRM"
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={saveLoading} className="gap-2">
                                    {saveLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Salvar Perfil
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : profiles.length === 0 ? (
                    <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <Inbox className="h-12 w-12 mb-4 opacity-20" />
                        <h3 className="font-bold">Nenhum perfil de e-mail</h3>
                        <p className="text-sm max-w-xs mt-2">Adicione seu primeiro servidor SMTP para começar a enviar e-mails.</p>
                    </Card>
                ) : (
                    profiles.map((profile) => (
                        <Card key={profile.id} className={cn(
                            "group transition-all hover:border-primary/50",
                            profile.isDefault && "border-primary/30 bg-primary/[0.02]"
                        )}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Server className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold">{profile.name}</h3>
                                                {profile.isDefault && <Badge className="h-5 text-[10px]">PADRÃO</Badge>}
                                                <Badge variant="secondary" className="h-5 text-[10px] uppercase">{profile.host}</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {profile.fromEmail}</span>
                                                <span className="flex items-center gap-1"><Inbox className="h-3 w-3" /> {profile.fromName || "Sem nome"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline" size="sm"
                                            disabled={profile.isDefault}
                                            onClick={() => handleToggleDefault(profile)}
                                            className="hidden sm:flex"
                                        >
                                            Definir Padrão
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => {
                                            setEditingProfile(profile);
                                            setIsDialogOpen(true);
                                        }}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(profile.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
