"use client";

import { useState } from "react";
import { Paintbrush, Moon, Sun, Monitor, Check, Layout, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useColorTheme } from "@/components/providers/ColorProvider";
import { cn } from "@/lib/utils";

export default function AparenciaPage() {
    const { theme, setTheme } = useTheme();
    const { colorTheme, setColorTheme } = useColorTheme();

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Palette className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Aparência e Personalização</h1>
                </div>
                <p className="text-muted-foreground">Personalize a identidade visual do seu CRM para combinar com sua marca.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Modo de Exibição */}
                <Card className="border-border/40 shadow-xl bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Monitor className="h-4 w-4" /> Modo de Exibição
                        </CardTitle>
                        <CardDescription>Escolha entre o modo claro, escuro ou do sistema.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-3">
                        <Button
                            variant="outline"
                            className={cn("flex-col gap-2 h-24", theme === "light" && "border-primary ring-1 ring-primary")}
                            onClick={() => setTheme("light")}
                        >
                            <Sun className="h-5 w-5" />
                            <span className="text-xs">Claro</span>
                        </Button>
                        <Button
                            variant="outline"
                            className={cn("flex-col gap-2 h-24", theme === "dark" && "border-primary ring-1 ring-primary")}
                            onClick={() => setTheme("dark")}
                        >
                            <Moon className="h-5 w-5" />
                            <span className="text-xs">Escuro</span>
                        </Button>
                        <Button
                            variant="outline"
                            className={cn("flex-col gap-2 h-24", theme === "system" && "border-primary ring-1 ring-primary")}
                            onClick={() => setTheme("system")}
                        >
                            <Monitor className="h-5 w-5" />
                            <span className="text-xs">Sistema</span>
                        </Button>
                    </CardContent>
                </Card>

                {/* Tema de Cor Primária */}
                <Card className="border-border/40 shadow-xl bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Paintbrush className="h-4 w-4" /> Cor da Identidade
                        </CardTitle>
                        <CardDescription>Esta será a cor principal de botões, links e ícones.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                        <button
                            onClick={() => setColorTheme("blue")}
                            className={cn(
                                "group relative h-12 w-12 rounded-full bg-[#00ffff] flex items-center justify-center transition-all hover:scale-110",
                                colorTheme === "blue" && "ring-2 ring-offset-2 ring-primary ring-offset-background"
                            )}
                        >
                            {colorTheme === "blue" && <Check className="h-4 w-4 text-black" />}
                            <span className="absolute -bottom-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">NetStream</span>
                        </button>

                        <button
                            onClick={() => setColorTheme("orange")}
                            className={cn(
                                "group relative h-12 w-12 rounded-full bg-[#f97316] flex items-center justify-center transition-all hover:scale-110",
                                colorTheme === "orange" && "ring-2 ring-offset-2 ring-primary ring-offset-background"
                            )}
                        >
                            {colorTheme === "orange" && <Check className="h-4 w-4 text-white" />}
                            <span className="absolute -bottom-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Laranja</span>
                        </button>

                        <button
                            onClick={() => setColorTheme("chartmogul")}
                            className={cn(
                                "group relative h-12 w-12 rounded-full border border-border bg-white flex items-center justify-center transition-all hover:scale-110 overflow-hidden",
                                colorTheme === "chartmogul" && "ring-2 ring-offset-2 ring-primary ring-offset-background"
                            )}
                        >
                            <div className="absolute inset-0 flex flex-col">
                                <div className="h-1/2 w-full bg-[#f8fafc]" />
                                <div className="h-1/2 w-full bg-white" />
                            </div>
                            <div className="relative z-10 h-3 w-3 rounded-full bg-[#2563eb]" />
                            {colorTheme === "chartmogul" && <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />}
                            <span className="absolute -bottom-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Professional</span>
                        </button>
                    </CardContent>
                </Card>
            </div>

            {/* Preview do Dashboard */}
            <Card className="border-border/40 overflow-hidden shadow-2xl">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Layout className="h-4 w-4" /> Preview da Interface
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-8 bg-background border-t">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Palette className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <div className="h-3 w-32 bg-primary/20 rounded-full" />
                                <div className="h-2 w-48 bg-muted rounded-full" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="h-24 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                <div className="h-2 w-12 bg-primary/30 rounded-full mb-2" />
                                <div className="h-4 w-8 bg-primary rounded-full" />
                            </div>
                            <div className="h-24 rounded-xl border border-border bg-card p-4">
                                <div className="h-2 w-12 bg-muted rounded-full mb-2" />
                                <div className="h-4 w-8 bg-muted rounded-full" />
                            </div>
                            <div className="h-24 rounded-xl border border-border bg-card p-4">
                                <div className="h-2 w-12 bg-muted rounded-full mb-2" />
                                <div className="h-4 w-8 bg-muted rounded-full" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="outline" size="sm">Secundário</Button>
                            <Button size="sm">Botão Primário</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
