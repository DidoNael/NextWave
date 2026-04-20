"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Puzzle, Calendar, Play, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function NfeConfigPage() {
    const [loading, setLoading] = useState(false);
    const [billingDay, setBillingDay] = useState("5");

    const handleCreateTask = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/sistema/agendador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Faturamento e NFE em Lote",
                    type: "nfe_batch",
                    cron: `0 9 ${billingDay} * *`, // 09:00 do dia selecionado
                    status: "active"
                })
            });

            if (res.ok) {
                toast.success("Rotina de faturamento agendada!");
            } else {
                toast.error("Erro ao agendar rotina");
            }
        } catch (error) {
            toast.error("Erro na conexão");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight theme-title">Notas Fiscais (NFE)</h1>
                <p className="text-muted-foreground text-sm">Configure a automação de faturamento e emissão de notas em lote.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="kpi-card">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <CardTitle>Rotina de Automação</CardTitle>
                        </div>
                        <CardDescription>Defina quando o sistema deve gerar as cobraníºas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Dia de Faturamento</Label>
                            <Select value={billingDay} onValueChange={setBillingDay}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o dia" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 5, 10, 15, 20, 25, 28].map(day => (
                                        <SelectItem key={day} value={day.toString()}>Todo dia {day.toString().padStart(2, "0")}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">Neste dia, às 09:00, o sistema processaríí todos os clientes ativos.</p>
                        </div>
                        <Button onClick={handleCreateTask} loading={loading} className="w-full">
                            Salvar Agendamento
                        </Button>
                    </CardContent>
                </Card>

                <Card className="kpi-card">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Play className="h-5 w-5" />
                            </div>
                            <CardTitle>Execução Manual</CardTitle>
                        </div>
                        <CardDescription>Dispare o processamento de notas agora.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-center h-[140px] pt-4">
                        <Button variant="outline" className="w-full border-dashed border-2 h-16 text-lg gap-3">
                            <FileText className="h-6 w-6" /> Gerar Lote Agora
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="kpi-card">
                <CardHeader>
                    <CardTitle>Histórico de Lotes</CardTitle>
                    <CardDescription>Áltimos processamentos realizados pelo sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-muted/30">
                                    <th className="p-3 text-left">Data</th>
                                    <th className="p-3 text-left">Tipo</th>
                                    <th className="p-3 text-left">Qtd. Notas</th>
                                    <th className="p-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-3 text-sm">05/03/2026</td>
                                    <td className="p-3 text-sm font-medium">Lote Mensal</td>
                                    <td className="p-3 text-sm">42</td>
                                    <td className="p-3">
                                        <Badge variant="success">Concluído</Badge>
                                    </td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-3 text-sm text-muted-foreground" colSpan={4}>Nenhum outro lote encontrado.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

