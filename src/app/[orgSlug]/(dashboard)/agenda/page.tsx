"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Trash2, Edit, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Event } from "@/types";
import { formatDateTime, getStatusLabel, cn } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(2, "Título obrigatório"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Data obrigatória"),
  endDate: z.string().optional(),
  type: z.enum(["reuniao", "call", "tarefa", "lembrete"]).default("reuniao"),
  status: z.enum(["agendado", "concluido", "cancelado"]).default("agendado"),
  location: z.string().optional(),
});

type EventForm = z.infer<typeof eventSchema>;

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  reuniao: { label: "Reunião", color: "text-blue-600", bg: "bg-blue-500" },
  call: { label: "Call", color: "text-emerald-600", bg: "bg-emerald-500" },
  tarefa: { label: "Tarefa", color: "text-purple-600", bg: "bg-purple-500" },
  lembrete: { label: "Lembrete", color: "text-amber-600", bg: "bg-amber-500" },
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function AgendaPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: "reuniao", status: "agendado" },
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const mes = currentDate.getMonth() + 1;
      const ano = currentDate.getFullYear();
      const res = await fetch(`/api/agenda?mes=${mes}&ano=${ano}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Erro ao carregar eventos");
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const openCreate = (date?: Date) => {
    setEditingEvent(null);
    const d = date ?? new Date();
    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    reset({ type: "reuniao", status: "agendado", startDate: localISO });
    setIsDialogOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    const startISO = new Date(event.startDate).toISOString().slice(0, 16);
    const endISO = event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "";
    reset({
      title: event.title,
      description: event.description ?? "",
      startDate: startISO,
      endDate: endISO,
      type: event.type as EventForm["type"],
      status: event.status as EventForm["status"],
      location: event.location ?? "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: EventForm) => {
    try {
      const url = editingEvent ? `/api/agenda/${editingEvent.id}` : "/api/agenda";
      const method = editingEvent ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success(editingEvent ? "Evento atualizado!" : "Evento criado!");
      setIsDialogOpen(false);
      fetchEvents();
    } catch {
      toast.error("Erro ao salvar evento");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/agenda/${deleteId}`, { method: "DELETE" });
      toast.success("Evento removido!");
      setDeleteId(null);
      fetchEvents();
    } catch {
      toast.error("Erro ao remover");
    }
  };

  // Calendário
  const ano = currentDate.getFullYear();
  const mes = currentDate.getMonth();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const getEventsDia = (dia: number) => {
    return events.filter((e) => {
      const d = new Date(e.startDate);
      return d.getFullYear() === ano && d.getMonth() === mes && d.getDate() === dia;
    });
  };

  const hoje = new Date();
  const proximosEventos = events
    .filter((e) => new Date(e.startDate) >= hoje)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">{events.length} evento{events.length !== 1 ? "s" : ""} este mês</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = "/api/auth/google"}>
            <Users className="h-4 w-4 mr-2" />
            Conectar Google
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {MESES[mes]} {ano}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setCurrentDate(new Date(ano, mes - 1, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs"
                    onClick={() => setCurrentDate(new Date())}>
                    Hoje
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setCurrentDate(new Date(ano, mes + 1, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-4">
              {/* Cabeçalho dos dias */}
              <div className="grid grid-cols-7 border-b border-border">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
              {/* Grid do calendário */}
              <div className="grid grid-cols-7">
                {/* Dias vazios no início */}
                {Array.from({ length: primeiroDia }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border p-1 bg-muted/20" />
                ))}
                {/* Dias do mês */}
                {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((dia) => {
                  const eventsDia = getEventsDia(dia);
                  const isHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano;
                  return (
                    <div
                      key={dia}
                      className={cn(
                        "min-h-[80px] border-b border-r border-border p-1 cursor-pointer transition-colors hover:bg-muted/30",
                        isHoje && "bg-primary/5"
                      )}
                      onClick={() => openCreate(new Date(ano, mes, dia, 9, 0))}
                    >
                      <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium mb-1",
                        isHoje && "bg-primary text-primary-foreground"
                      )}>
                        {dia}
                      </span>
                      <div className="space-y-0.5">
                        {eventsDia.slice(0, 2).map((e) => {
                          const config = TYPE_CONFIG[e.type];
                          return (
                            <div
                              key={e.id}
                              className={cn("text-[10px] px-1 py-0.5 rounded truncate text-white cursor-pointer", config?.bg ?? "bg-primary")}
                              onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                            >
                              {e.title}
                            </div>
                          );
                        })}
                        {eventsDia.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{eventsDia.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximos Eventos */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {proximosEventos.length === 0 ? (
                <div className="px-6 pb-6 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum evento próximo</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {proximosEventos.map((event) => {
                    const config = TYPE_CONFIG[event.type];
                    return (
                      <div key={event.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className={cn("mt-0.5 h-3 w-3 rounded-full shrink-0", config?.bg ?? "bg-primary")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{formatDateTime(event.startDate)}</p>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(event)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteId(event.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legenda */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">TIPOS DE EVENTO</p>
              <div className="space-y-2">
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", config.bg)} />
                    <span className="text-sm">{config.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
            <DialogDescription>Preencha os dados do evento na agenda.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Ex: Reunião com cliente" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
                          <SelectItem key={v} value={v}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data/Hora Início *</Label>
                <Input type="datetime-local" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Data/Hora Fim</Label>
                <Input type="datetime-local" {...register("endDate")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input placeholder="Ex: Escritório, Google Meet..." {...register("location")} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Detalhes do evento..." {...register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : editingEvent ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Evento</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
