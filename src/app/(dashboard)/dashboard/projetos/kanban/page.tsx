"use client";

import { useState, useEffect } from "react";
import { Plus, FolderKanban, Loader2, ChevronDown, MoreHorizontal, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  dueDate?: string | null;
  columnId: string;
  order: number;
}

interface Column {
  id: string;
  title: string;
  order: number;
  tasks: Task[];
}

interface Project {
  id: string;
  name: string;
  color: string | null;
  description?: string | null;
  dueDate?: string | null;
  columns: Column[];
}

interface ProjectSummary {
  id: string;
  name: string;
  color: string | null;
  description?: string | null;
}

// â”€â”€ Priority badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    alta: "bg-destructive/10 text-destructive border-destructive/20",
    media: "bg-muted text-muted-foreground border-border",
    baixa: "bg-primary/10 text-primary border-primary/20",
  };
  const label: Record<string, string> = { alta: "Alta", media: "MÃ©dia", baixa: "Baixa" };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", map[priority] ?? map.media)}>
      {label[priority] ?? priority}
    </span>
  );
}

// â”€â”€ Task Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TaskCard({
  task,
  columns,
  onMove,
}: {
  task: Task;
  columns: Column[];
  onMove: (taskId: string, targetColumnId: string) => void;
}) {
  const otherColumns = columns.filter((c) => c.id !== task.columnId);

  return (
    <div className="group bg-background border border-border/60 rounded-xl p-3 shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug flex-1">{task.title}</p>
        {otherColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">Mover para</p>
              <DropdownMenuSeparator />
              {otherColumns.map((col) => (
                <DropdownMenuItem key={col.id} onClick={() => onMove(task.id, col.id)} className="gap-2 text-sm">
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  {col.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className="text-[10px] text-muted-foreground">{formatDate(task.dueDate)}</span>
        )}
      </div>
    </div>
  );
}

// â”€â”€ Kanban Column â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function KanbanColumn({
  column,
  allColumns,
  onTaskAdded,
  onTaskMoved,
}: {
  column: Column;
  allColumns: Column[];
  onTaskAdded: (columnId: string, title: string) => Promise<void>;
  onTaskMoved: (taskId: string, targetColumnId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    await onTaskAdded(column.id, newTitle.trim());
    setNewTitle("");
    setAdding(false);
    setSaving(false);
  };

  return (
    <div className="flex flex-col bg-muted/30 rounded-2xl border border-border/50 min-w-[280px] max-w-[280px]">
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{column.title}</span>
          <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {column.tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto max-h-[calc(100vh-260px)]">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} columns={allColumns} onMove={onTaskMoved} />
        ))}

        {/* Inline add */}
        {adding && (
          <div className="bg-background border border-primary/40 rounded-xl p-3 space-y-2">
            <Input
              autoFocus
              placeholder="TÃ­tulo da tarefa..."
              className="h-8 text-sm bg-muted/50 border-border/60"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={saving || !newTitle.trim()}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Adicionar"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdding(false); setNewTitle(""); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {column.tasks.length === 0 && !adding && (
          <div
            className="text-center py-6 text-muted-foreground/50 text-xs cursor-pointer hover:text-muted-foreground transition-colors"
            onClick={() => setAdding(true)}
          >
            + Adicionar tarefa
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ProjetosKanbanPage() {
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingProject, setLoadingProject] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state for new project
  const [form, setForm] = useState({ name: "", description: "", color: "#3b82f6", dueDate: "" });
  const [saving, setSaving] = useState(false);

  // Fetch list of projects (summary)
  useEffect(() => {
    async function fetchList() {
      setLoadingList(true);
      try {
        const res = await fetch("/api/projetos");
        if (!res.ok) throw new Error();
        const data: ProjectSummary[] = await res.json();
        setSummaries(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch {
        toast.error("NÃ£o foi possÃ­vel carregar os projetos.");
      } finally {
        setLoadingList(false);
      }
    }
    fetchList();
  }, []);

  // Fetch full project (with columns + tasks) when selectedId changes
  useEffect(() => {
    if (!selectedId) { setProject(null); return; }
    async function fetchProject() {
      setLoadingProject(true);
      try {
        const res = await fetch(`/api/projetos/${selectedId}`);
        if (!res.ok) throw new Error();
        const data: Project = await res.json();
        setProject(data);
      } catch {
        toast.error("NÃ£o foi possÃ­vel carregar o projeto.");
      } finally {
        setLoadingProject(false);
      }
    }
    fetchProject();
  }, [selectedId]);

  // Add task to a column
  async function handleTaskAdded(columnId: string, title: string) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, columnId, priority: "media" }),
      });
      if (!res.ok) throw new Error();
      const newTask: Task = await res.json();
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col
          ),
        };
      });
      toast.success("Tarefa criada!");
    } catch {
      toast.error("Erro ao criar tarefa.");
    }
  }

  // Move task to another column
  async function handleTaskMoved(taskId: string, targetColumnId: string) {
    // Optimistic update
    setProject((prev) => {
      if (!prev) return prev;
      let movedTask: Task | null = null;
      const newCols = prev.columns.map((col) => {
        const filtered = col.tasks.filter((t) => {
          if (t.id === taskId) { movedTask = t; return false; }
          return true;
        });
        return { ...col, tasks: filtered };
      });
      if (!movedTask) return prev;
      const finalCols = newCols.map((col) =>
        col.id === targetColumnId ? { ...col, tasks: [...col.tasks, { ...movedTask!, columnId: targetColumnId }] } : col
      );
      return { ...prev, columns: finalCols };
    });

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, columnId: targetColumnId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tarefa movida!");
    } catch {
      toast.error("Erro ao mover tarefa.");
      // Revert â€” re-fetch the project
      if (selectedId) {
        const res = await fetch(`/api/projetos/${selectedId}`);
        if (res.ok) setProject(await res.json());
      }
    }
  }

  // Create new project
  async function handleCreateProject() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          color: form.color,
          dueDate: form.dueDate || null,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setSummaries((prev) => [{ id: created.id, name: created.name, color: created.color, description: created.description }, ...prev]);
      setSelectedId(created.id);
      setDialogOpen(false);
      setForm({ name: "", description: "", color: "#3b82f6", dueDate: "" });
      toast.success("Projeto criado!");
    } catch {
      toast.error("Erro ao criar projeto.");
    } finally {
      setSaving(false);
    }
  }

  const selectedSummary = summaries.find((s) => s.id === selectedId) ?? null;

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loadingList) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[280px] space-y-3">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projetos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {summaries.length} projeto{summaries.length !== 1 ? "s" : ""} Â· Quadro Kanban
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-full h-9 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FolderKanban className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Nenhum projeto ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro projeto para comeÃ§ar</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-full">
            <Plus className="h-4 w-4" /> Criar projeto
          </Button>
        </div>
      ) : (
        <>
          {/* Project selector */}
          <div className="flex gap-2 flex-wrap">
            {summaries.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                  s.id === selectedId
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color || "hsl(var(--primary))" }}
                />
                {s.name}
              </button>
            ))}
          </div>

          {/* Kanban board */}
          {loadingProject ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-w-[280px] space-y-3">
                  <Skeleton className="h-12 w-full rounded-t-2xl" />
                  <Skeleton className="h-24 w-full rounded-xl mx-3" style={{ width: "calc(100% - 24px)" }} />
                  <Skeleton className="h-20 w-full rounded-xl mx-3" style={{ width: "calc(100% - 24px)" }} />
                </div>
              ))}
            </div>
          ) : project ? (
            <div className="flex gap-4 overflow-x-auto pb-6">
              {[...project.columns].sort((a, b) => a.order - b.order).map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  allColumns={project.columns}
                  onTaskAdded={handleTaskAdded}
                  onTaskMoved={handleTaskMoved}
                />
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* Create Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
            <DialogDescription>Crie um projeto para organizar tarefas no Kanban.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Casamento Torres & Silva"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>DescriÃ§Ã£o</Label>
              <Input
                placeholder="DescriÃ§Ã£o opcional..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-10 h-9 rounded-lg border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-9 font-mono text-sm"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreateProject} disabled={saving || !form.name.trim()} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

