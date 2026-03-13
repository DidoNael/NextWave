"use client";

import { useState, useRef, useEffect } from "react";
import {
    Send, Paperclip, MoreVertical, Phone, Video,
    Smile, Image as ImageIcon, FileText, User, Mic, ArrowLeft
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
    status?: "sent" | "delivered" | "read";
}

const MOCK_MESSAGES: Message[] = [
    { id: "1", body: "Olá, bem-vindo ao suporte NextWave!", fromMe: true, time: "10:00", status: "read" },
    { id: "2", body: "Como posso ajudá-lo hoje?", fromMe: true, time: "10:00", status: "read" },
    { id: "3", body: "Olá! Gostaria de saber mais sobre o plano Pro.", fromMe: false, time: "10:30" },
    { id: "4", body: "Claro! O plano Pro inclui automações avançadas e o módulo de WhatsApp que estamos usando agora.", fromMe: true, time: "10:31", status: "delivered" },
];

export function ChatWindow({ chat, onBack }: { chat: any, onBack?: () => void }) {
    const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        const newMessage: Message = {
            id: Date.now().toString(),
            body: input,
            fromMe: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "sent"
        };
        setMessages([...messages, newMessage]);
        setInput("");
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950/20">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden -ml-2 h-9 w-9"
                            onClick={onBack}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                {chat.customerName ? chat.customerName.charAt(0) : <User className="h-5 w-5" />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold leading-none truncate max-w-[140px] sm:max-w-none">
                                {chat.customerName || `+${chat.phone}`}
                            </h3>
                            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                online agora
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                    <Button variant="ghost" size="icon" className="h-9 w-9 opacity-50"><Phone className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 opacity-50"><Video className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9"><MoreVertical className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1" ref={scrollRef}>
                <div className="flex flex-col gap-3 p-4 min-h-full justify-end">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-full max-w-[80%] flex-col gap-1",
                                msg.fromMe ? "ml-auto items-end" : "items-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all",
                                    msg.fromMe
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-card border border-border rounded-tl-none"
                                )}
                            >
                                {msg.body}
                            </div>
                            <div className="flex items-center gap-1.5 px-1">
                                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                    {msg.time}
                                </span>
                                {msg.fromMe && (
                                    <span className={cn(
                                        "text-[10px]",
                                        msg.status === "read" ? "text-sky-500" : "text-muted-foreground"
                                    )}>
                                        ✓✓
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer / Input */}
            <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary"><Smile className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary"><Paperclip className="h-5 w-5" /></Button>
                    </div>
                    <div className="flex-1 relative group">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Digite sua mensagem..."
                            className="pr-12 bg-accent/50 border-none shadow-none h-12 rounded-2xl focus-visible:ring-1 group-hover:bg-accent transition-colors"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="absolute right-1 top-1 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                            size="icon"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 bg-accent/50 text-muted-foreground rounded-2xl"><Mic className="h-5 w-5" /></Button>
                </div>
            </div>
        </div>
    );
}
