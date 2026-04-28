"use client";

import {
    useEffect,
    useRef,
    useState
} from "react";
import {
    Settings, Key, Link2, Server,
    Plus, Trash2, Edit2, CheckCircle2, XCircle, RefreshCw, Save, ShieldCheck,
    MessageSquare, MoreHorizontal, QrCode
} from "lucide-react";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Channel {
    id: string;
    name: string;
    instanceName: string;
    status: string;
    isActive: boolean;
}

export default function WhatsAppSettingsPage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [qrStatus, setQrStatus] = useState<'loading' | 'ready' | 'connected' | 'error'>('loading');
    const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const isQrDialogOpenRef = useRef(false);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [newName, setNewName] = useState("");
    const [newInstance, setNewInstance] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Global Config States
    const [globalApiUrl, setGlobalApiUrl] = useState("https://evolution.nextwave.com");
    const [globalApiKey, setGlobalApiKey] = useState("");
    const [waVersion, setWaVersion] = useState("2.3000.x");
    const [isSavingGlobal, setIsSavingGlobal] = useState(false);

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/whatsapp/config");
            const data = await res.json();
            if (data) {
                if (data.apiUrl) setGlobalApiUrl(data.apiUrl);
                if (data.apiKey) setGlobalApiKey(data.apiKey);
                if (data.waVersion) setWaVersion(data.waVersion);
            }
        } catch (error) {
            console.error("Erro ao carregar configurações");
        }
    };

    const fetchChannels = async () => {
        try {
            const res = await fetch("/api/whatsapp/channels");
            const data = await res.json();
            if (Array.isArray(data)) {
                setChannels(data);
            }
        } catch (error) {
            toast.error("Erro ao carregar canais");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChannels();
        fetchConfig();
    }, []);

    const handleSaveGlobal = async () => {
        setIsSavingGlobal(true);
        try {
            const res = await fetch("/api/whatsapp/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiUrl: globalApiUrl,
                    apiKey: globalApiKey,
                    waVersion: waVersion
                }),
            });

            if (res.ok) {
                toast.success("Configurações globais salvas!");
            } else {
                toast.error("Erro ao salvar configurações");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setIsSavingGlobal(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        // ... (rest of helper functions)
        e.preventDefault();
        if (!newName || !newInstance) return;

        try {
            const res = await fetch("/api/whatsapp/channels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, instanceName: newInstance }),
            });

            if (res.ok) {
                toast.success("Canal criado com sucesso!");
                setNewName("");
                setNewInstance("");
                setIsCreateOpen(false);
                fetchChannels();
            } else {
                toast.error("Erro ao criar canal");
            }
        } catch (error) {
            toast.error("Erro ao conectar com servidor");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deseja realmente excluir este canal?")) return;

        try {
            const res = await fetch(`/api/whatsapp/channels/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Canal excluído");
                fetchChannels();
            }
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    const handleToggle = async (id: string, current: boolean) => {
        try {
            const res = await fetch(`/api/whatsapp/channels/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !current }),
            });
            if (res.ok) {
                fetchChannels();
            }
        } catch (error) {
            toast.error("Erro ao atualizar status");
        }
    };

    const loadQrCode = async (channel: Channel) => {
        setSelectedChannel(channel);
        setQrCode(null);
        setQrStatus('loading');
        setConnectedPhone(null);
        isQrDialogOpenRef.current = true;
        setIsQrDialogOpen(true);

        const pollQr = async () => {
            if (!isQrDialogOpenRef.current) return;

            try {
                const res = await fetch(`/api/whatsapp/channels/${channel.id}/qrcode`);
                const data = await res.json();

                if (data.qrcode) {
                    const qrSrc = data.qrcode.startsWith('data:') ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
                    setQrCode(qrSrc);
                    setQrStatus('ready');
                    return;
                }

                if (data.status === 'connected') {
                    setQrStatus('connected');
                    setConnectedPhone(data.phone || null);
                    fetchChannels();
                    toast.success(
                        data.phone
                            ? `WhatsApp conectado! Número: +${data.phone}`
                            : 'WhatsApp conectado com sucesso!',
                        { duration: 4000 }
                    );
                    // Fecha o dialog após 1.5s para o usuário ver o checkmark
                    setTimeout(() => {
                        isQrDialogOpenRef.current = false;
                        setIsQrDialogOpen(false);
                    }, 1500);
                    return;
                }

                if (data.status === 'error') {
                    setQrStatus('error');
                    return;
                }

                // Ainda preparando — continua polling
                setTimeout(pollQr, 3000);
            } catch (error) {
                console.error("Erro no polling do QR Code:", error);
                setTimeout(pollQr, 5000);
            }
        };

        pollQr();
    };

    return (
        <div className="max-w-5xl space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold tracking-tight">Canais de Atendimento</h1>
                    </div>
                    <p className="text-muted-foreground">Gerencie seus números e instâncias do WhatsApp.</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                            <Plus className="h-4 w-4" /> Novo Canal
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Adicionar Canal</DialogTitle>
                                <DialogDescription>Configure uma nova instância do WhatsApp para seu sistema.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nome do Canal (ex: Suporte Comercial)</Label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Comercial..."
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome da Instância (sem espaços)</Label>
                                    <Input
                                        value={newInstance}
                                        onChange={(e) => setNewInstance(e.target.value)}
                                        placeholder="instancia_nextwave_01"
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Criar Instância</Button>
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
                ) : channels.length === 0 ? (
                    <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <QrCode className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="font-bold">Nenhum canal configurado</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mt-2">
                            Clique em "Novo Canal" para começar a conectar seu sistema ao WhatsApp.
                        </p>
                    </Card>
                ) : channels.map((channel) => (
                    <Card key={channel.id} className="group hover:border-primary/50 transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                                        channel.status === "connected" ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                                    )}>
                                        <Server className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold">{channel.name}</h3>
                                            <Badge variant={channel.status === "connected" ? "success" : "secondary"} className="h-5 text-[10px] px-1.5 uppercase">
                                                {channel.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-tighter">
                                            Instance: {channel.instanceName}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col items-end mr-4">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Ativo</span>
                                        <Switch
                                            checked={channel.isActive}
                                            onCheckedChange={() => handleToggle(channel.id, channel.isActive)}
                                        />
                                    </div>
                                    <Button variant="outline" size="icon" className="h-9 w-9 opacity-50 hover:opacity-100">
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 text-destructive opacity-50 hover:opacity-100"
                                        onClick={() => handleDelete(channel.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="gap-2 ml-2"
                                        onClick={() => loadQrCode(channel)}
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" /> QR Code
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-slate-50 dark:bg-slate-900/40 border-dashed border-2">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-primary" />
                        Configurações Globais da API (Evolution)
                    </CardTitle>
                    <CardDescription>Estes parâmetros se aplicam a todos os canais e controlam o motor do WhatsApp.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>URL da API Principal</Label>
                            <Input
                                value={globalApiUrl}
                                onChange={(e) => setGlobalApiUrl(e.target.value)}
                                placeholder="https://api.seuservidor.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Global API Key</Label>
                            <Input
                                type="password"
                                value={globalApiKey}
                                onChange={(e) => setGlobalApiKey(e.target.value)}
                                placeholder="••••••••••••••••"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Versão do WhatsApp Web</Label>
                            <Input
                                value={waVersion}
                                onChange={(e) => setWaVersion(e.target.value)}
                                placeholder="2.3000.1015901300"
                            />
                            <p className="text-[10px] text-muted-foreground">Obrigatório para Evolution API v2+ evitar desconexões.</p>
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button
                            onClick={handleSaveGlobal}
                            disabled={isSavingGlobal}
                            className="gap-2"
                        >
                            {isSavingGlobal ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Salvar Configurações Globais
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code Dialog */}
            <Dialog open={isQrDialogOpen} onOpenChange={(open) => { isQrDialogOpenRef.current = open; setIsQrDialogOpen(open); }}>
                <DialogContent className="sm:max-w-md flex flex-col items-center">
                    <DialogHeader className="w-full text-center">
                        <DialogTitle>
                            {qrStatus === 'connected' ? `✅ ${selectedChannel?.name}` : `Conectar ${selectedChannel?.name}`}
                        </DialogTitle>
                        <DialogDescription>
                            {qrStatus === 'connected'
                                ? `Número ${connectedPhone ? `+${connectedPhone}` : ''} já está conectado a este canal.`
                                : qrStatus === 'error'
                                    ? 'Não foi possível gerar o QR Code. Verifique as configurações.'
                                    : 'Aponte o WhatsApp do seu celular para este código para conectar.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 bg-white rounded-2xl shadow-inner my-4 flex items-center justify-center min-h-[280px] min-w-[280px]">
                        {qrStatus === 'ready' && qrCode ? (
                            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                        ) : qrStatus === 'connected' ? (
                            <div className="flex flex-col items-center gap-3 text-emerald-600">
                                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="h-12 w-12" />
                                </div>
                                <p className="text-base font-semibold">Conectado</p>
                                {connectedPhone && (
                                    <p className="text-sm text-muted-foreground font-mono">+{connectedPhone}</p>
                                )}
                            </div>
                        ) : qrStatus === 'error' ? (
                            <div className="flex flex-col items-center gap-3 text-destructive">
                                <XCircle className="h-16 w-16 opacity-50" />
                                <p className="text-sm text-center text-muted-foreground">
                                    Instância não encontrada ou Evolution API indisponível.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-slate-400">
                                <RefreshCw className="h-10 w-10 animate-spin" />
                                <p className="text-sm animate-pulse">Gerando QR Code...</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="w-full sm:justify-center">
                        <Button variant="outline" onClick={() => loadQrCode(selectedChannel!)} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            {qrStatus === 'connected' ? 'Reconectar' : 'Recarregar'}
                        </Button>
                        <Button onClick={() => { isQrDialogOpenRef.current = false; setIsQrDialogOpen(false); }} className="px-8">
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
