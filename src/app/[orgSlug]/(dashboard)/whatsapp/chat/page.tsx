"use client";

import { useState, useEffect, Suspense } from "react";
import { ChatList } from "@/components/whatsapp/ChatList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { MessageSquareOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Altura do chat = 100vh − header(64px) − padding vertical do main por breakpoint:
 *   mobile  → p-4  = 16px × 2 = 32px  → calc(100vh - 96px)
 *   md      → p-6  = 24px × 2 = 48px  → calc(100vh - 112px)
 *   lg      → p-8  = 32px × 2 = 64px  → calc(100vh - 128px)
 * Tailwind: usar underscore para espaços dentro de calc()
 */
const CHAT_HEIGHT =
    "h-[calc(100vh_-_96px)] md:h-[calc(100vh_-_112px)] lg:h-[calc(100vh_-_128px)]";

function ChatPageContent() {
    const searchParams = useSearchParams();
    const phoneParam = searchParams.get("phone");
    const [selectedChat, setSelectedChat] = useState<any>(null);

    useEffect(() => {
        if (phoneParam) {
            setSelectedChat({
                id: "nova-conversa-" + phoneParam,
                phone: phoneParam,
                customerName: null,
                lastMessage: "",
                time: "Agora",
                unread: 0,
            });
        }
    }, [phoneParam]);

    return (
        <div className={cn(
            CHAT_HEIGHT,
            "border border-border rounded-2xl overflow-hidden bg-card/30 backdrop-blur-xl flex",
            "shadow-xl shadow-slate-200/40 dark:shadow-none"
        )}>
            {/* Painel esquerdo — lista de conversas */}
            <div className={cn(
                "flex-shrink-0 transition-all duration-300 w-full",
                "md:w-[340px] lg:w-[400px] xl:w-[440px]",
                selectedChat ? "hidden md:flex" : "flex"
            )}>
                <ChatList onSelect={setSelectedChat} selectedId={selectedChat?.id} />
            </div>

            {/* Painel direito — janela de conversa */}
            <div className={cn(
                "flex-1 min-w-0 overflow-hidden transition-all duration-300",
                !selectedChat ? "hidden md:flex" : "flex"
            )}>
                {selectedChat ? (
                    <ChatWindow chat={selectedChat} onBack={() => setSelectedChat(null)} />
                ) : (
                    /* Estado vazio — visível somente no desktop */
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/30 dark:bg-slate-950/20 animate-in fade-in zoom-in-95 duration-700">
                        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                            <MessageSquareOff className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight mb-2">Selecione uma conversa</h3>
                        <p className="text-muted-foreground max-w-[280px] text-sm leading-relaxed">
                            Clique em um contato na lista para visualizar o histórico e responder seus clientes.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function WhatsAppChatPage() {
    return (
        <Suspense fallback={
            <div className={cn(CHAT_HEIGHT, "flex items-center justify-center text-muted-foreground text-sm")}>
                Carregando Chat...
            </div>
        }>
            <ChatPageContent />
        </Suspense>
    );
}
