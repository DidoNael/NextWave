"use client";

import { Search, User, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const MOCK_CHATS: Chat[] = [
    { id: "1", phone: "5511999999999", customerName: "João Silva", lastMessage: "Olá, gostaria de saber mais sobre...", time: "10:30", unread: 2, online: true },
    { id: "2", phone: "5511888888888", customerName: "Maria Souza", lastMessage: "Obrigada pelo atendimento!", time: "09:15", unread: 0 },
    { id: "3", phone: "5511777777777", customerName: null, lastMessage: "Transferência confirmada.", time: "Ontem", unread: 0 },
];

interface ChatListProps {
    onSelect: (chat: Chat) => void;
    selectedId?: string;
}

export function ChatList({ onSelect, selectedId }: ChatListProps) {
    return (
        <div className="flex flex-col h-full md:border-r border-border bg-card/50 w-full">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Conversas</h2>
                    <Badge variant="secondary" className="rounded-full">12 ativos</Badge>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar contato..."
                        className="pl-9 bg-background/50 border-none shadow-none focus-visible:ring-1"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="px-2 pb-4 space-y-1">
                    {MOCK_CHATS.map((chat) => (
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
                                    {chat.lastMessage}
                                </p>
                            </div>
                            {chat.unread > 0 && (
                                <div className="h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center animate-pulse">
                                    {chat.unread}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

function Badge({ children, variant, className }: any) {
    return (
        <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
            variant === "secondary" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground",
            className
        )}>
            {children}
        </span>
    );
}
