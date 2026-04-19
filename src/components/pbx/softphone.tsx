"use client";

import { useState, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, Minus, History, User } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sipClient, SipStatus } from "@/lib/sip-client";
import { toast } from "sonner";

export function Softphone() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [number, setNumber] = useState("");
    const [callStatus, setCallStatus] = useState<"idle" | "calling" | "active" | "incoming">("idle");
    const [isMuted, setIsMuted] = useState(false);
    const [status, setStatus] = useState<SipStatus>("offline");
    const [recentCalls, setRecentCalls] = useState<{ number: string; date: string }[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 320, height: 520 });

    const addDigit = (digit: string) => {
        setNumber(prev => prev + digit);
    };

    const handleCall = () => {
        if (!number) return;
        if (status !== "online") {
            toast.error("SIP não registrado. Verifique configurações.");
            return;
        }

        setCallStatus("calling");
        sipClient.call(number);

        // Adiciona ao histórico
        const call = { number, date: new Date().toLocaleString() };
        const newHistory = [call, ...recentCalls].slice(0, 10);
        setRecentCalls(newHistory);
        localStorage.setItem("pbx_call_history", JSON.stringify(newHistory));

        // Simulação de transição para ativo (no mundo real JsSIP eventos fariam isso)
        setTimeout(() => setCallStatus("active"), 3000);
    };

    const handleEndCall = () => {
        sipClient.terminate();
        setCallStatus("idle");
        setNumber("");
    };

    const toggleMute = () => {
        const next = !isMuted;
        setIsMuted(next);
        sipClient.toggleMute(next);
    };

    useEffect(() => {
        const savedHistory = localStorage.getItem("pbx_call_history");
        if (savedHistory) setRecentCalls(JSON.parse(savedHistory));

        sipClient.onStatusChange((newStatus) => {
            setStatus(newStatus);
            if (newStatus === "online") toast.success("PABX Conectado");
            if (newStatus === "error") toast.error("Falha na conexão SIP");
        });

        // Tenta carregar configuração e iniciar
        fetch("/api/sistema/pbx")
            .then(res => res.json())
            .then(config => {
                if (config && config.isActive) {
                    sipClient.init(config);
                }
            })
            .catch(() => console.error("Falha ao carregar config PBX"));

        // Listener para chamadas externas
        const handleExternalCall = (e: any) => {
            if (e.detail?.number) {
                setNumber(e.detail.number);
                setIsOpen(true);
                setIsMinimized(false);
                // Pequeno delay para garantir que o estado atualizou antes de ligar
                setTimeout(() => {
                    handleCall();
                }, 500);
            }
        };
        window.addEventListener('pbx:call' as any, handleExternalCall);

        return () => {
            sipClient.stop();
            window.removeEventListener('pbx:call' as any, handleExternalCall);
        };
    }, [status, recentCalls, handleCall]);

    if (!isOpen) {
        return null;
    }

    if (isMinimized) {
        return (
            <motion.div
                drag
                dragMomentum={false}
                className="fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing"
            >
                <Button
                    onClick={() => setIsMinimized(false)}
                    className={cn(
                        "h-14 w-14 rounded-full shadow-2xl animate-in zoom-in",
                        status === "online" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-primary"
                    )}
                >
                    <div className="relative">
                        <Phone className="h-6 w-6" />
                        <div className={cn(
                            "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white",
                            status === "online" ? "bg-emerald-400" : status === "connecting" ? "bg-yellow-400" : "bg-red-400"
                        )} />
                    </div>
                </Button>
            </motion.div>
        );
    }

    return (
        <motion.div
            drag
            dragMomentum={false}
            className="fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing"
            style={{ width: dimensions.width, height: dimensions.height }}
        >
            <Card className={cn(
                "w-full h-full shadow-2xl border-primary/20 overflow-hidden flex flex-col",
                "transition-[height,width] duration-300"
            )}>
            <CardHeader className="bg-primary text-primary-foreground p-3 flex flex-row items-center justify-between space-y-0 select-none">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "h-2 w-2 rounded-full",
                        status === "online" ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                    )} />
                    <span className="text-sm font-bold">PBX {status.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsMinimized(true)}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            {!isMinimized && (
                <CardContent className="p-4 flex flex-col h-[calc(100%-56px)]">
                    {callStatus === "idle" ? (
                        <div className="space-y-6 flex flex-col flex-1">
                            {showHistory ? (
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold uppercase text-muted-foreground">Chamadas Recentes</h4>
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowHistory(false)}>Voltar</Button>
                                    </div>
                                    {recentCalls.length === 0 ? (
                                        <p className="text-center text-xs text-muted-foreground py-8">Nenhum registro</p>
                                    ) : (
                                        recentCalls.map((c, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer" onClick={() => { setNumber(c.number); setShowHistory(false); }}>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Phone className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{c.number}</p>
                                                        <p className="text-[10px] text-muted-foreground">{c.date}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Input
                                        value={number}
                                        onChange={(e) => setNumber(e.target.value)}
                                        placeholder="Digitar número..."
                                        className="text-2xl text-center h-16 font-mono tracking-widest border-0 focus-visible:ring-0 bg-secondary/30"
                                    />

                                    <div className="grid grid-cols-3 gap-2 flex-1 items-center">
                                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(d => (
                                            <Button
                                                key={d}
                                                variant="outline"
                                                className="h-14 text-xl font-bold rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all"
                                                onClick={() => addDigit(d)}
                                            >
                                                {d}
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => setShowHistory(true)}>
                                            <History className="h-5 w-5" />
                                        </Button>
                                        <Button className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 gap-2 font-bold" onClick={handleCall}>
                                            <Phone className="h-5 w-5" /> Chamada Real
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-8 flex-1 animate-in slide-in-from-bottom">
                            <div className="space-y-2 text-center">
                                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto relative">
                                    <User className="h-10 w-10 text-primary" />
                                    <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
                                </div>
                                <h3 className="text-xl font-bold">{number}</h3>
                                <p className="text-sm text-muted-foreground animate-pulse">
                                    {callStatus === "calling" ? "Chamando..." : "Em chamada (Real)"}
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className={cn("h-14 w-14 rounded-full", isMuted && "bg-destructive/10 border-destructive")}
                                    onClick={toggleMute}
                                >
                                    {isMuted ? <MicOff className="h-6 w-6 text-destructive" /> : <Mic className="h-6 w-6" />}
                                </Button>
                                <Button variant="outline" size="icon" className="h-14 w-14 rounded-full">
                                    <Volume2 className="h-6 w-6" />
                                </Button>
                            </div>

                            <Button
                                variant="destructive"
                                className="w-full h-14 rounded-2xl gap-2 font-bold"
                                onClick={handleEndCall}
                            >
                                <PhoneOff className="h-6 w-6" /> Desligar
                            </Button>
                        </div>
                    )}
                </CardContent>
            )}
            </Card>
            {!isMinimized && (
                <div 
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-[60] flex items-center justify-center"
                    onMouseDown={(e) => {
                        e.stopPropagation(); // Impede que o drag do framer-motion interfira
                        e.preventDefault();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startW = dimensions.width;
                        const startH = dimensions.height;

                        const onMouseMove = (moveEvent: MouseEvent) => {
                            setDimensions({
                                width: Math.max(280, startW + (moveEvent.clientX - startX)),
                                height: Math.max(400, startH + (moveEvent.clientY - startY))
                            });
                        };

                        const onMouseUp = () => {
                            window.removeEventListener('mousemove', onMouseMove);
                            window.removeEventListener('mouseup', onMouseUp);
                        };

                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                    }}
                >
                    <div className="w-3 h-3 border-r-2 border-b-2 border-primary/40 rotate-45 mr-1 mb-1" />
                </div>
            )}
        </motion.div>
    );
}
