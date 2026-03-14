"use client";

import { Moon, Sun, Monitor, Check, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useColorTheme } from "@/components/providers/ColorProvider";
import type { AccentColor } from "@/components/providers/ColorProvider";
import { cn } from "@/lib/utils";

const ACCENT_COLORS: { value: AccentColor; label: string; hex: string; dark: boolean }[] = [
    { value: "blue",   label: "Ciano",     hex: "#00e5ff", dark: true  },
    { value: "orange", label: "Laranja",   hex: "#f97316", dark: false },
    { value: "green",  label: "Esmeralda", hex: "#10b981", dark: false },
    { value: "purple", label: "Violeta",   hex: "#8b5cf6", dark: false },
    { value: "rose",   label: "Rosa",      hex: "#f43f5e", dark: false },
    { value: "pink",   label: "Rosa Claro", hex: "#ec4899", dark: false },
];

const DISPLAY_MODES = [
    { value: "light",  label: "Claro",   Icon: Sun     },
    { value: "dark",   label: "Escuro",  Icon: Moon    },
    { value: "system", label: "Sistema", Icon: Monitor },
];

export default function AparenciaPage() {
    const { theme, setTheme } = useTheme();
    const { accentColor, layoutTheme, setAccentColor, setLayoutTheme } = useColorTheme();

    return (
        <div className="max-w-4xl space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Paintbrush className="h-5 w-5 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight theme-title">Aparência</h1>
                </div>
                <p className="text-muted-foreground text-sm">Personalize o visual do CRM para combinar com sua marca.</p>
            </div>

            {/* Modo de Exibição */}
            <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Modo de Exibição</p>
                <div className="flex gap-3">
                    {DISPLAY_MODES.map(({ value, label, Icon }) => (
                        <button
                            key={value}
                            onClick={() => setTheme(value)}
                            className={cn(
                                "flex flex-col items-center gap-2 px-6 py-4 rounded-xl border-2 text-sm font-medium transition-all hover:border-primary/50",
                                theme === value
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border bg-card text-muted-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Estilo de Layout */}
            <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Estilo de Layout</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">

                    {/* Padrão */}
                    <button
                        onClick={() => setLayoutTheme("default")}
                        className={cn(
                            "relative rounded-xl border-2 overflow-hidden text-left transition-all hover:border-primary/50 group",
                            layoutTheme === "default" ? "border-primary" : "border-border"
                        )}
                    >
                        {layoutTheme === "default" && (
                            <span className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                                <Check className="h-3 w-3 text-primary-foreground" />
                            </span>
                        )}
                        {/* Mini Preview - Padrão */}
                        <div className="h-40 bg-[#0f0f14] flex overflow-hidden">
                            <div className="w-14 bg-[#0f0f14] border-r border-white/5 flex flex-col items-center gap-2 pt-4">
                                <div className="h-4 w-4 rounded-lg bg-primary/80" />
                                <div className="mt-2 flex flex-col gap-1.5 items-center w-full px-2">
                                    <div className="h-2 w-full rounded-md bg-primary/20" />
                                    <div className="h-2 w-full rounded-md bg-white/5" />
                                    <div className="h-2 w-full rounded-md bg-white/5" />
                                    <div className="h-2 w-full rounded-md bg-white/5" />
                                </div>
                            </div>
                            <div className="flex-1 p-4 flex flex-col gap-3">
                                <div className="h-2 w-24 bg-white/20 rounded-full" />
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-12 rounded-xl border border-white/5 bg-white/5 p-2 flex flex-col gap-1">
                                        <div className="h-1.5 w-8 bg-white/20 rounded-full" />
                                        <div className="h-3 w-5 bg-primary/60 rounded-md" />
                                    </div>
                                    <div className="h-12 rounded-xl border border-white/5 bg-white/5 p-2 flex flex-col gap-1">
                                        <div className="h-1.5 w-8 bg-white/20 rounded-full" />
                                        <div className="h-3 w-5 bg-white/20 rounded-md" />
                                    </div>
                                </div>
                                <div className="h-5 rounded-xl bg-primary/30 border border-primary/20" />
                            </div>
                        </div>
                        <div className="px-4 py-3 border-t border-border bg-card">
                            <p className="text-sm font-semibold">Padrão</p>
                            <p className="text-xs text-muted-foreground">Moderno com bordas arredondadas e gradientes</p>
                        </div>
                    </button>

                    {/* Professional */}
                    <button
                        onClick={() => setLayoutTheme("professional")}
                        className={cn(
                            "relative rounded-xl border-2 overflow-hidden text-left transition-all hover:border-primary/50 group",
                            layoutTheme === "professional" ? "border-primary" : "border-border"
                        )}
                    >
                        {layoutTheme === "professional" && (
                            <span className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                                <Check className="h-3 w-3 text-white" />
                            </span>
                        )}
                        {/* Mini Preview - Professional (ChartMogul) */}
                        <div className="h-40 bg-white flex overflow-hidden">
                            {/* Sidebar */}
                            <div className="w-16 bg-white border-r border-gray-100 flex flex-col pt-4 px-3 gap-1.5">
                                <div className="h-2 w-7 bg-gray-800 rounded-none" />
                                <div className="mt-2 h-px w-full bg-gray-100" />
                                <div className="h-2 w-9 bg-blue-500 rounded-none" />
                                <div className="h-px w-9 bg-blue-500 rounded-none" />
                                <div className="h-2 w-7 bg-gray-200 rounded-none" />
                                <div className="h-2 w-8 bg-gray-200 rounded-none" />
                                <div className="h-2 w-6 bg-gray-200 rounded-none" />
                            </div>
                            {/* Content */}
                            <div className="flex-1 p-4 flex flex-col gap-2.5 bg-white">
                                <div className="h-2.5 w-20 bg-gray-800 rounded-none font-black" />
                                <div className="h-px bg-gray-100 w-full" />
                                <div className="flex gap-4">
                                    <div className="flex-1 border-b border-gray-100 pb-2">
                                        <div className="h-1.5 w-10 bg-gray-300 rounded-none mb-1" />
                                        <div className="h-3 w-8 bg-gray-800 rounded-none" />
                                    </div>
                                    <div className="flex-1 border-b border-gray-100 pb-2">
                                        <div className="h-1.5 w-10 bg-gray-300 rounded-none mb-1" />
                                        <div className="h-3 w-6 bg-gray-800 rounded-none" />
                                    </div>
                                    <div className="flex-1 border-b border-gray-100 pb-2">
                                        <div className="h-1.5 w-10 bg-gray-300 rounded-none mb-1" />
                                        <div className="h-3 w-7 bg-gray-800 rounded-none" />
                                    </div>
                                </div>
                                <div className="h-px bg-gray-100 w-full" />
                                <div className="flex items-center gap-2">
                                    <div className="h-5 bg-blue-500 rounded-none w-16" />
                                    <div className="h-5 border border-gray-200 rounded-none w-14" />
                                </div>
                            </div>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100 bg-white">
                            <p className="text-sm font-semibold text-gray-900">Professional</p>
                            <p className="text-xs text-gray-500">Clean minimalista com linhas finas — estilo ChartMogul</p>
                        </div>
                    </button>
                </div>
            </section>

            {/* Cor de Destaque */}
            <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Cor de Destaque</p>
                <div className="flex flex-wrap gap-5">
                    {ACCENT_COLORS.map(({ value, label, hex, dark }) => (
                        <div key={value} className="flex flex-col items-center gap-2">
                            <button
                                onClick={() => setAccentColor(value)}
                                title={label}
                                className={cn(
                                    "h-12 w-12 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm",
                                    accentColor === value && "ring-2 ring-offset-2 ring-offset-background"
                                )}
                                style={{
                                    backgroundColor: hex,
                                    outlineColor: accentColor === value ? hex : "transparent",
                                }}
                            >
                                {accentColor === value && (
                                    <Check className="h-5 w-5" style={{ color: dark ? "#000" : "#fff" }} />
                                )}
                            </button>
                            <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Live Preview */}
            <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Preview em Tempo Real</p>
                <div className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-background p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold theme-title">Dashboard</h2>
                                <p className="text-xs text-muted-foreground">Visualização ao vivo do tema selecionado</p>
                            </div>
                            <Button size="sm">Ação Principal</Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="kpi-card p-4 rounded-[var(--radius)] border border-border bg-card">
                                <p className="text-xs text-muted-foreground mb-1">Receita MRR</p>
                                <p className="text-xl font-bold">R$ 0,00</p>
                                <p className="text-xs text-muted-foreground mt-1 font-medium">Sem dados este mês</p>
                            </div>
                            <div className="p-4 rounded-[var(--radius)] border border-border bg-card">
                                <p className="text-xs text-muted-foreground mb-1">Clientes</p>
                                <p className="text-xl font-bold">0</p>
                                <p className="text-xs text-muted-foreground mt-1">Total ativo</p>
                            </div>
                            <div className="p-4 rounded-[var(--radius)] border border-border bg-card">
                                <p className="text-xs text-muted-foreground mb-1">Projetos</p>
                                <p className="text-xl font-bold">0</p>
                                <p className="text-xs text-muted-foreground mt-1">Em andamento</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">Cancelar</Button>
                            <Button variant="ghost" size="sm">Secundário</Button>
                            <Button size="sm">Confirmar</Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
