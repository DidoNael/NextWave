"use client";

import { useState, useEffect } from "react";
import { Search, User, MessageSquare, Plus, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NewChatModal } from "@/components/whatsapp/NewChatModal";
import { cn } from "@/lib/utils";

interface Chat {
    id: string;
    phone: string;
    customerName: string | null;
    lastMessage: string;
    time: string;
    unread: number;
    online?: boolean;
}

interface ChatListProps {
    onSelect: (chat: Chat) => void;
    selectedId?: string;
}

export function ChatList({ onSelect, selectedId }: ChatListProps) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchChats = async () => {
        setLoading(true);
        try {
            // Chamada para buscar chats da Evolution API
            const response = await fetch("/api/whatsapp/chats");
            if (response.ok) {
                const data = await response.json();
                setChats(data.chats || []);
            }
        } catch (error) {
            console.error("Erro ao buscar conversas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();
        
        // Atualizar lista a cada 10 segundos
        const interval = setInterval(fetchChats, 10000);
        return () => clearInterval(interval);
    }, []);

    const filteredChats = chats.filter(chat => 
        chat.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        chat.phone.includes(searchTerm)
    );

    return (
        <div className="flex flex-col h-full md:border-r border-border bg-card/50 w-full">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-bold tracking-tight">Conversas</h2>
                    <div className="flex items-center gap-1.5">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground flex-shrink-0"
                            onClick={fetchChats}
                            disabled={loading}
                            title="Atualizar"
                        >
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                        <Button
                            size="sm"
                            className="gap-1.5 h-9 px-3 shadow-sm shadow-primary/20 transition-all hover:scale-105"
                            onClick={() => setIsNewChatOpen(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Nova mensagem
                        </Button>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar contato..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-background/50 border-none shadow-none focus-visible:ring-1 h-10"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="px-2 pb-4 space-y-1">
                    {loading && chats.length === 0 ? (
                        <div className="space-y-2 p-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-16 w-full bg-accent/20 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : filteredChats.length > 0 ? (
                        filteredChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => onSelect(chat)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-accent/50 group",
                                    selectedId === chat.id && "bg-accent shadow-sm"
                                )}
                            >
                                <div className="relative">
                                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {chat.customerName ? chat.customerName.charAt(0) : <User className="h-5 w-5" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    {chat.online && (
                                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                                    )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold text-sm truncate">
                                            {chat.customerName || `+${chat.phone}`}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {chat.time}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate leading-relaxed">
                                        {chat.lastMessage || "Nenhuma mensagem"}
                                    </p>
                                </div>
                                {chat.unread > 0 && (
                                    <div className="h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center animate-pulse">
                                        {chat.unread}
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center opacity-40 h-40">
                            <MessageSquare className="h-12 w-12 mb-2" />
                            <p className="text-xs">Nenhuma conversa encontrada</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <NewChatModal 
                isOpen={isNewChatOpen} 
                onClose={() => setIsNewChatOpen(false)} 
                onSelect={(chat: Chat) => {
                    setChats(prev => [chat, ...prev]);
                    onSelect(chat);
                    setIsNewChatOpen(false);
                }}
            />
        </div>
    );
}
