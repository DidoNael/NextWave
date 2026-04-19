"use client";

import { AlertOctagon, Mail, Phone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function BlockedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-destructive rounded-full blur-[120px]" />
            </div>

            <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6 animate-pulse">
                        <Lock className="h-10 w-10" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Sistema Suspenso</CardTitle>
                    <CardDescription className="text-lg">
                        Acesso temporariamente bloqueado.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-4 text-center">
                    <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 space-y-2">
                        <div className="flex items-center justify-center gap-2 text-destructive font-semibold">
                            <AlertOctagon className="h-4 w-4" />
                            <span>Pendência Detectada</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Identificamos uma pendência na licença de uso deste software. Para restabelecer o acesso total aos seus dados e ferramentas, entre em contato com o suporte técnico.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                        <Button variant="outline" className="h-12 justify-start gap-3 px-4" asChild>
                            <a href="mailto:suporte@nextwavecrm.com.br">
                                <Mail className="h-5 w-5 text-primary" />
                                <div className="text-left">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Email de Suporte</p>
                                    <p className="text-sm">suporte@nextwavecrm.com.br</p>
                                </div>
                            </a>
                        </Button>
                        <Button variant="outline" className="h-12 justify-start gap-3 px-4" asChild>
                            <a href="https://wa.me/5500000000000" target="_blank">
                                <Phone className="h-5 w-5 text-emerald-500" />
                                <div className="text-left">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">WhatsApp Financeiro</p>
                                    <p className="text-sm">(00) 00000-0000</p>
                                </div>
                            </a>
                        </Button>
                    </div>
                </CardContent>

                <CardFooter className="justify-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-6 rounded-b-xl">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold text-center">
                        NextWave Master License Control System v1.2.0<br />
                        ID da Instância: {typeof window !== 'undefined' ? window.location.hostname : 'loading...'}
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
