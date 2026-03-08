"use client";

import { useState } from "react";
import { ChatList } from "@/components/whatsapp/ChatList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { MessageSquareOff } from "lucide-react";

export default function WhatsAppChatPage() {
    const [selectedChat, setSelectedChat] = useState<any>(null);

    return (
        <div className="h-[calc(100vh-140px)] border border-border rounded-2xl overflow-hidden bg-card/30 backdrop-blur-xl flex shadow-2xl shadow-slate-200/50 dark:shadow-none">
            <div className="w-[320px] lg:w-[380px] flex-shrink-0">
                <ChatList onSelect={setSelectedChat} selectedId={selectedChat?.id} />
            </div>
            <div className="flex-1 overflow-hidden">
                {selectedChat ? (
                    <ChatWindow chat={selectedChat} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/30 dark:bg-slate-950/20 animate-in fade-in zoom-in-95 duration-700">
                        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                            <MessageSquareOff className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight mb-2">Selecione uma conversa</h3>
                        <p className="text-muted-foreground max-w-[280px]">
                            Clique em um contato na lista ao lado para visualizar o histórico de mensagens e responder seus clientes.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
