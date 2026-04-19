"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Copy, CheckCircle2, RotateCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function PixPayment({ amount, orderId }: { amount: number, orderId: string }) {
    const [status, setStatus] = useState<"pending" | "paid">("pending");
    const [loading, setLoading] = useState(false);
    const pixKey = "00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925NextWave CRM SASS6009SAO PAULO62070503***6304E2B1";

    const copyKey = () => {
        navigator.clipboard.writeText(pixKey);
        toast.success("Código Pix copiado!");
    };

    // Simulação de confirmação visual
    const simulatePayment = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setStatus("paid");
            toast.success("Pagamento confirmado via Pix!");
        }, 3000);
    };

    return (
        <Card className="max-w-md mx-auto overflow-hidden kpi-card">
            <AnimatePresence mode="wait">
                {status === "pending" ? (
                    <motion.div
                        key="pending"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="p-6 space-y-6"
                    >
                        <div className="text-center space-y-2">
                            <CardTitle className="text-2xl font-black">Pagamento via Pix</CardTitle>
                            <CardDescription>Escaneie ou copie o código para pagar</CardDescription>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <div className="p-6 bg-white border-4 border-primary/20 rounded-3xl shadow-xl relative group">
                                <QrCode className="h-48 w-48 text-primary" />
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                    <Badge className="bg-primary text-white">QR Code Dinâmico</Badge>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-3xl font-black text-primary">R$ {amount.toFixed(2)}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Vence em 30 minutos</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button onClick={copyKey} variant="outline" className="w-full h-12 gap-2 border-2">
                                <Copy className="h-4 w-4" /> Copiar Código Pix
                            </Button>
                            <Button onClick={simulatePayment} loading={loading} className="w-full h-12 gap-2 bg-emerald-500 hover:bg-emerald-600">
                                <RotateCw className="h-4 w-4" /> Verificar Status
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="paid"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-12 flex flex-col items-center text-center space-y-6 bg-emerald-500/5"
                    >
                        <div className="relative">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1.2 }}
                                className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-xl"
                            />
                            <CheckCircle2 className="h-24 w-24 text-emerald-500 relative z-10" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-emerald-600">Pagamento Confirmado!</h2>
                            <p className="text-muted-foreground">O pedido #{orderId} foi processado e liberado com sucesso.</p>
                        </div>

                        <Button className="w-full bg-emerald-500 hover:bg-emerald-600 h-12 text-lg">
                            Ir para o Dashboard
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
