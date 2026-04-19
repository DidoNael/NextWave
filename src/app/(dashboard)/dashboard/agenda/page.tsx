"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn, formatDateTime, getStatusLabel } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType =
  | "reuniao"
  | "sessao"
  | "evento"
  | "casamento"
  | "entrega"
  | "newborn";
type EventStatus = "agendado" | "realizado" | "cancelado";

interface AgendaEvent {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  description?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  reuniao: "Reunião",
  sessao: "Sessão",
  evento: "Evento",
  casamento: "Casamento",
  entrega: "Entrega",
  newborn: "Newborn",
};

const EVENT_TYPE_DOT: Record<EventType, string> = {
  reuniao: "bg-primary",
  sessao: "bg-sky-500",
  evento: "bg-violet-500",
  casamento: "bg-rose-500",
  entrega: "bg-green-500",
  newborn: "bg-teal-500",
};

const EVENT_TYPE_PILL: Record<EventType, string> = {
  reuniao: "bg-primary/10 text-primary",
  sessao: "bg-sky-500/10 text-sky-600",
  evento: "bg-violet-500/10 text-violet-600",
  casamento: "bg-rose-500/10 text-rose-600",
  entrega: "bg-green-500/10 text-green-700",
  newborn: "bg-teal-500/10 text-teal-600",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  type: z.enum(["reuniao", "sessao", "evento", "casamento", "entrega", "newborn"]),
  status: z.enum(["agendado", "realizado", "cancelado"]),
  startDate: z.string().min(1, "Data de início obrigatória"),
  endDate: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      type: "reuniao",
      status: "agendado",
      startDate: "",
      endDate: "",
      location: "",
      description: "",
    },
  });

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/agenda?mes=${viewMonth + 1}&ano=${viewYear}`
      );
      if (!res.ok) throw new Error("Erro ao carregar eventos");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Não foi possível carregar os eventos");
    } finally {
      setLoading(false);
    }
  }, [viewMonth, viewYear]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // ─── Navigation ────────────────────────────────────────────────────────────

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  // ─── Dialog ─────────────────────────────────────────────────────────────────

  function openCreate(day?: number) {
    setEditingEvent(null);
    const date = day
      ? new Date(viewYear, viewMonth, day)
      : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const defaultStart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
    form.reset({
      title: "",
      type: "reuniao",
      status: "agendado",
      startDate: defaultStart,
      endDate: "",
      location: "",
      description: "",
    });
    setDialogOpen(true);
  }

  function openEdit(ev: AgendaEvent) {
    setEditingEvent(ev);
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    form.reset({
      title: ev.title,
      type: ev.type,
      status: ev.status,
      startDate: toLocal(ev.startDate),
      endDate: ev.endDate ? toLocal(ev.endDate) : "",
      location: ev.location ?? "",
      description: ev.description ?? "",
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: EventFormValues) {
    try {
      const payload = {
        ...values,
        endDate: values.endDate || undefined,
        location: values.location || undefined,
        description: values.description || undefined,
      };

      if (editingEvent) {
        const res = await fetch(`/api/agenda/${editingEvent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Evento atualizado");
      } else {
        const res = await fetch("/api/agenda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("Evento criado");
      }
      setDialogOpen(false);
      void fetchEvents();
    } catch {
      toast.error("Erro ao salvar evento");
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/agenda/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Evento excluído");
      setDeleteId(null);
      void fetchEvents();
    } catch {
      toast.error("Erro ao excluir evento");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Calendar grid ──────────────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  function getEventsForDay(day: number): AgendaEvent[] {
    return events.filter((ev) => {
      const d = new Date(ev.startDate);
      return (
        d.getFullYear() === viewYear &&
        d.getMonth() === viewMonth &&
        d.getDate() === day
      );
    });
  }

  // ─── Upcoming events ────────────────────────────────────────────────────────

  const upcomingEvents = events
    .filter((ev) => new Date(ev.startDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus eventos e compromissos
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* ── Left: Calendar ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToday}>
                Hoje
              </Button>
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <div className="w-[120px]" />
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDay + 1;
              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
              const isToday =
                isCurrentMonth &&
                isSameDay(new Date(viewYear, viewMonth, dayNum), today);
              const dayEvents = isCurrentMonth ? getEventsForDay(dayNum) : [];
              const visibleEvents = dayEvents.slice(0, 2);
              const extraCount = dayEvents.length - visibleEvents.length;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isCurrentMonth) {
                      setSelectedDay(dayNum);
                      openCreate(dayNum);
                    }
                  }}
                  className={cn(
                    "min-h-[90px] p-1.5 border-b border-r border-border/50 cursor-pointer transition-colors",
                    isCurrentMonth
                      ? "hover:bg-muted/40"
                      : "opacity-30 cursor-default",
                    isToday && "bg-primary/10"
                  )}
                >
                  {isCurrentMonth && (
                    <>
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1",
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground"
                        )}
                      >
                        {dayNum}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {visibleEvents.map((ev) => (
                          <button
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(ev);
                            }}
                            className={cn(
                              "w-full text-left truncate text-[10px] font-medium px-1.5 py-0.5 rounded",
                              EVENT_TYPE_PILL[ev.type]
                            )}
                          >
                            {ev.title}
                          </button>
                        ))}
                        {extraCount > 0 && (
                          <span className="text-[10px] text-muted-foreground pl-1">
                            +{extraCount} mais
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Upcoming Events ── */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Próximos Eventos
            </h3>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum evento próximo
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {upcomingEvents.map((ev) => {
                const d = new Date(ev.startDate);
                return (
                  <div key={ev.id} className="p-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Date badge */}
                      <div className="flex flex-col items-center justify-center min-w-[40px] rounded-lg bg-muted py-1 px-0.5">
                        <span className="text-xs font-bold text-foreground leading-none">
                          {String(d.getDate()).padStart(2, "0")}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                          {MONTH_NAMES[d.getMonth()].slice(0, 3)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              EVENT_TYPE_DOT[ev.type]
                            )}
                          />
                          <span className="text-xs font-medium text-foreground truncate">
                            {ev.title}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            {d.toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {ev.location}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(ev)}
                          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(ev.id)}
                          className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline delete confirmation */}
                    {deleteId === ev.id && (
                      <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between gap-2">
                        <span className="text-xs text-destructive font-medium">
                          Excluir este evento?
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => setDeleteId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 px-2 text-xs"
                            loading={deleting}
                            onClick={() => handleDelete(ev.id)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Nome do evento"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Type */}
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(v) =>
                    form.setValue("type", v as EventType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(
                      ([val, label]) => (
                        <SelectItem key={val} value={val}>
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                EVENT_TYPE_DOT[val]
                              )}
                            />
                            {label}
                          </span>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) =>
                    form.setValue("status", v as EventStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Start date */}
              <div className="space-y-1.5">
                <Label htmlFor="startDate">
                  Início <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.startDate.message}
                  </p>
                )}
              </div>

              {/* End date */}
              <div className="space-y-1.5">
                <Label htmlFor="endDate">Término</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...form.register("endDate")}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                placeholder="Endereço ou link"
                {...form.register("location")}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Detalhes do evento..."
                rows={3}
                {...form.register("description")}
              />
            </div>

            <Separator />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                {editingEvent ? "Salvar alterações" : "Criar evento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
