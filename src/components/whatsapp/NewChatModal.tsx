"use client";

import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User, Phone, MessageSquarePlus, ArrowRight } from "lucide-react";

interface Client {
    id: string;
    name: string;
    phone?: string;
}

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (chat: { id: string; phone: string; customerName: string | null; lastMessage: string; time: string; unread: number }) => void;
}

export function NewChatModal({ isOpen, onClose, onSelect }: NewChatModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [directPhone, setDirectPhone] = useState("");
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchClients();
            setSearchTerm("");
            setDirectPhone("");
            setTimeout(() => searchRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/clientes");
            if (response.ok) {
                const data = await response.json();
                setClients(data.clientes || []);
            }
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone && client.phone.includes(searchTerm))
    );

    const handleStartChat = (phone: string, name: string | null) => {
        const cleanPhone = phone.replace(/\D/g, "");
        if (!cleanPhone) return;

        onSelect({
            id: "nova-conversa-" + cleanPhone,
            phone: cleanPhone,
            customerName: name,
            lastMessage: "",
            time: "Agora",
            unread: 0,
        });
        onClose();
    };

    const handleDirectPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Aceita apenas dígitos
        setDirectPhone(e.target.value.replace(/\D/g, ""));
    };

    const canStartDirect = directPhone.length >= 8;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
                <DialogHeader className="p-6 pb-3 border-b border-border/50">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MessageSquarePlus className="h-5 w-5 text-primary" />
                        </div>
                        Nova Mensagem
                    </DialogTitle>
                    <DialogDescription>
                        Selecione um cliente ou informe o número de destino.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 space-y-4">
                    {/* Campo de número direto */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Número de telefone
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="5511999999999"
                                    className="pl-9 h-11 bg-background/60 border-border/60 font-mono tracking-wide"
                                    value={directPhone}
                                    onChange={handleDirectPhone}
                                    onKeyDown={(e) => e.key === "Enter" && canStartDirect && handleStartChat(directPhone, null)}
                                    inputMode="numeric"
                                />
                            </div>
                            <Button
                                className="h-11 px-4 gap-1.5"
                                disabled={!canStartDirect}
                                onClick={() => handleStartChat(directPhone, null)}
                            >
                                Abrir
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground px-1">
                            DDI + DDD + número, somente dígitos (ex: 5511987654321)
                        </p>
                    </div>

                    {/* Divisor */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ou selecione um cliente</span>
                        <div className="flex-1 h-px bg-border/50" />
                    </div>

                    {/* Busca de clientes */}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchRef}
                            placeholder="Buscar por nome ou telefone..."
                            className="pl-9 h-11 bg-background/60 border-border/60"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <ScrollArea className="h-[220px]">
                        {loading ? (
                            <div className="flex flex-col gap-2 pr-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-14 w-full bg-accent/20 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredClients.length > 0 ? (
                            <div className="space-y-1 pr-3">
                                {filteredClients.map((client) => (
                                    <button
                                        key={client.id}
                                        onClick={() => handleStartChat(client.phone || "", client.name)}
                                        disabled={!client.phone}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-accent/60 group text-left disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Avatar className="h-10 w-10 border border-border shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                {client.name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">{client.name}</p>
                                            <p className="text-xs text-muted-foreground truncate font-mono">
                                                {client.phone || "Sem telefone cadastrado"}
                                            </p>
                                        </div>
                                        {!client.phone && (
                                            <Badge variant="secondary" className="text-[9px] flex-shrink-0">Sem tel.</Badge>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground opacity-50">
                                <User className="h-10 w-10 mb-2" />
                                <p className="text-sm">Nenhum cliente encontrado</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
