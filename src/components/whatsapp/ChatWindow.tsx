"use client";

import { useState, useRef, useEffect } from "react";
import {
    Send, Paperclip, MoreVertical, Phone, Video,
    Smile, User, Mic, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    body: string;
    fromMe: boolean;
    time: string;
    status?: "sent" | "delivered" | "read" | "error";
}

export function ChatWindow({ chat, onBack }: { chat: any; onBack?: () => void }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    // Carregamento inicial — substitui tudo
    const loadMessages = async (phone: string) => {
        try {
            const res = await fetch(`/api/whatsapp/messages?phone=${phone}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error("Erro ao carregar mensagens:", error);
        }
    };

    // Polling — faz merge aditivo: nunca remove mensagens confirmadas do estado
    const mergeMessages = async (phone: string) => {
        try {
            const res = await fetch(`/api/whatsapp/messages?phone=${phone}`);
            if (!res.ok) return;
            const data = await res.json();
            const incoming: Message[] = data.messages || [];

            // Se o servidor não retornou nada, preserva o estado atual (evita apagar mensagens)
            if (incoming.length === 0) return;

            setMessages((prev) => {
                const incomingIds = new Set(incoming.map((m) => m.id));

                // Remove otimistas que já foram confirmados pelo servidor (mesmo corpo, fromMe)
                const resolvedOptIds = new Set<string>();
                incoming.forEach((serverMsg) => {
                    if (serverMsg.fromMe) {
                        const opt = prev.find(
                            (m) => m.id.startsWith("opt-") && m.body === serverMsg.body
                        );
                        if (opt) resolvedOptIds.add(opt.id);
                    }
                });

                // Mantém mensagens existentes que não foram substituídas por versões do servidor
                const kept = prev.filter(
                    (m) => !incomingIds.has(m.id) && !resolvedOptIds.has(m.id)
                );

                const merged = [...kept, ...incoming];
                merged.sort((a, b) => {
                    const ta = (a as any).timestamp || 0;
                    const tb = (b as any).timestamp || 0;
                    return ta - tb;
                });
                return merged;
            });
        } catch (error) {
            console.error("Erro ao atualizar mensagens:", error);
        }
    };

    useEffect(() => {
        setMessages([]);
        if (!chat?.phone) return;

        loadMessages(chat.phone);

        // Polling a cada 5s — fallback caso SSE caia
        pollingRef.current = setInterval(() => mergeMessages(chat.phone), 5000);

        // SSE — atualiza imediatamente quando webhook recebe mensagem
        let lastCount = -1;
        const es = new EventSource("/api/whatsapp/events");
        es.onmessage = (e) => {
            try {
                const { count } = JSON.parse(e.data);
                if (lastCount >= 0 && count > lastCount) {
                    mergeMessages(chat.phone);
                    // Som de notificação para mensagens recebidas
                    try {
                        const ctx = new AudioContext();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.setValueAtTime(880, ctx.currentTime);
                        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
                        gain.gain.setValueAtTime(0.15, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                        osc.start(ctx.currentTime);
                        osc.stop(ctx.currentTime + 0.4);
                    } catch {
                        // AudioContext não disponível (ex: tab em segundo plano)
                    }
                }
                lastCount = count;
            } catch {
                // JSON inválido
            }
        };
        es.onerror = () => es.close(); // Polling cobre o fallback

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            es.close();
        };
    }, [chat?.phone]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [chat]);

    const handleSend = async () => {
        if (!input.trim() || sending) return;

        const body = input;
        setInput("");
        setSending(true);

        // Otimista: adiciona localmente antes de confirmar
        const optimisticMsg: Message = {
            id: `opt-${Date.now()}`,
            body,
            fromMe: true,
            time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            status: "sent",
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        try {
            const response = await fetch("/api/whatsapp/messages/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ number: chat.phone, text: body }),
            });
            if (!response.ok) {
                // Marca mensagem otimista como erro em vez de removê-la
                setMessages((prev) =>
                    prev.map((m) => m.id === optimisticMsg.id ? { ...m, status: "error" } : m)
                );
                console.error("Erro ao enviar mensagem");
            } else {
                // Aguarda 2s e faz merge — a msg otimista fica até o servidor confirmar
                setTimeout(() => mergeMessages(chat.phone), 2000);
            }
        } catch (error) {
            setMessages((prev) =>
                prev.map((m) => m.id === optimisticMsg.id ? { ...m, status: "error" } : m)
            );
            console.error("Erro na requisição de envio:", error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full min-w-0 bg-slate-50 dark:bg-slate-950/20">

            {/* Header */}
            <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Botão voltar — só aparece no mobile */}
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden -ml-2 h-9 w-9 flex-shrink-0"
                            onClick={onBack}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <Avatar className="h-10 w-10 border border-border flex-shrink-0">
                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                            {chat.customerName ? chat.customerName.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 ml-1">
                        <h3 className="text-sm font-bold leading-none truncate">
                            {chat.customerName || `+${chat.phone}`}
                        </h3>
                        <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {chat.customerName ? `+${chat.phone}` : "WhatsApp"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-0.5 text-muted-foreground flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-9 w-9 opacity-30 cursor-not-allowed" disabled>
                        <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 opacity-30 cursor-not-allowed" disabled>
                        <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Área de mensagens */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
                <div className="flex flex-col gap-2 p-4 md:p-6 min-h-full justify-end">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center opacity-25 py-16">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-3">
                                <User className="h-8 w-8" />
                            </div>
                            <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
                            <p className="text-xs mt-1">Envie uma mensagem para iniciar a conversa.</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex flex-col gap-0.5 max-w-[80%] md:max-w-[65%] lg:max-w-[55%]",
                                msg.fromMe ? "ml-auto items-end" : "items-start"
                            )}
                        >
                            <div className={cn(
                                "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                                msg.fromMe
                                    ? msg.status === "error"
                                        ? "bg-destructive/80 text-destructive-foreground rounded-tr-sm"
                                        : "bg-primary text-primary-foreground rounded-tr-sm"
                                    : "bg-card border border-border rounded-tl-sm"
                            )}>
                                {msg.body}
                            </div>
                            <div className="flex items-center gap-1 px-1">
                                <span className="text-[9px] text-muted-foreground">
                                    {msg.time}
                                </span>
                                {msg.fromMe && (
                                    msg.status === "error"
                                        ? <span className="text-[9px] text-destructive">Falha ao enviar</span>
                                        : <span className={cn(
                                            "text-[10px]",
                                            msg.status === "read" ? "text-sky-500" : "text-muted-foreground/60"
                                        )}>✓✓</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Barra de input */}
            <div className="flex-shrink-0 p-3 md:p-4 bg-card/80 backdrop-blur-sm border-t border-border">
                <div className="flex items-center gap-1.5 w-full">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary flex-shrink-0 rounded-xl">
                        <Smile className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary flex-shrink-0 rounded-xl">
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 relative min-w-0">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                            placeholder="Digite uma mensagem..."
                            className="pr-12 bg-accent/50 border-none shadow-none h-11 rounded-2xl focus-visible:ring-1"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || sending}
                            className="absolute right-1 top-0.5 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                            size="icon"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground flex-shrink-0 rounded-xl bg-accent/40">
                        <Mic className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
