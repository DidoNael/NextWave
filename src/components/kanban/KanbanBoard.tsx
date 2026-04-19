"use client";

import { useState, useEffect, useCallback } from "react";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDroppable,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Calendar, Clock, Edit, Trash, ArrowRight, Settings, Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

type Task = {
    id: string;
    title: string;
    description?: string;
    priority: "alta" | "media" | "baixa";
    scope: string;
    order: number;
    dueDate?: string;
    columnId: string;
};

type Column = {
    id: string;
    title: string;
    order: number;
    tasks: Task[];
};

type Project = {
    id: string;
    name: string;
    description?: string;
    color?: string;
    columns: Column[];
};

/* ─── Task Card ─── */
function TaskCard({ task, onEdit, onDelete }: { task: Task; onEdit?: () => void; onDelete?: () => void }) {
    return (
        <Card className="cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/20 transition-all border-none shadow-sm shadow-black/5">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm leading-tight">{task.title}</p>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 -mr-2 bg-transparent hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Opções da Tarefa</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onEdit} className="gap-2">
                                <Edit className="h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Trash className="h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}</span>
                    </div>
                    <Badge
                        variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "warning" : "secondary"}
                        className="text-[9px] px-1.5 py-0 uppercase font-black"
                    >
                        {task.priority}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

function SortableCard({ task, onEdit, onDelete }: { task: Task; onEdit?: () => void; onDelete?: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
            {...attributes}
            {...listeners}
        >
            <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
        </div>
    );
}

function DroppableColumn({ column, children }: { column: Column; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });
    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col gap-3 min-h-[500px] p-2 rounded-xl border-2 border-dashed transition-colors ${isOver ? "border-primary/40 bg-primary/5" : "border-transparent bg-muted/20 hover:border-border"}`}
        >
            {children}
        </div>
    );
}

/* ─── Main Board ─── */
export default function KanbanBoard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [taskDialog, setTaskDialog] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "media", columnId: "" });
    const [projectDialog, setProjectDialog] = useState(false);
    const [projectForm, setProjectForm] = useState({ name: "", description: "", color: "#3b82f6" });
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    /* ─── Fetch Projects ─── */
    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch("/api/projetos");
            if (!res.ok) throw new Error();
            const data = await res.json();
            setProjects(data);
            if (data.length > 0 && !activeProjectId) {
                setActiveProjectId(data[0].id);
            }
        } catch {
            toast.error("Erro ao carregar projetos");
        } finally {
            setLoading(false);
        }
    }, [activeProjectId]);

    /* ─── Fetch Project Detail (columns + tasks) ─── */
    const fetchProjectDetail = useCallback(async (projectId: string) => {
        try {
            const res = await fetch(`/api/projetos/${projectId}`);
            if (!res.ok) throw new Error();
            const data: Project = await res.json();
            setColumns(data.columns || []);
        } catch {
            toast.error("Erro ao carregar quadro");
        }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);
    useEffect(() => { if (activeProjectId) fetchProjectDetail(activeProjectId); }, [activeProjectId, fetchProjectDetail]);

    /* ─── Create Project ─── */
    const handleCreateProject = async () => {
        if (!projectForm.name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/projetos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(projectForm),
            });
            if (!res.ok) throw new Error();
            const newProject = await res.json();
            setProjects(prev => [newProject, ...prev]);
            setActiveProjectId(newProject.id);
            setProjectDialog(false);
            setProjectForm({ name: "", description: "", color: "#3b82f6" });
            toast.success("Projeto criado!");
        } catch {
            toast.error("Erro ao criar projeto");
        } finally {
            setSaving(false);
        }
    };

    /* ─── Create / Edit Task ─── */
    const handleSaveTask = async () => {
        if (!taskForm.title.trim() || !taskForm.columnId) return;
        setSaving(true);
        try {
            if (editingTask) {
                const res = await fetch("/api/tasks", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingTask.id, ...taskForm }),
                });
                if (!res.ok) throw new Error();
                toast.success("Tarefa atualizada!");
            } else {
                const col = columns.find(c => c.id === taskForm.columnId);
                const res = await fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...taskForm, order: col ? col.tasks.length : 0 }),
                });
                if (!res.ok) throw new Error();
                toast.success("Tarefa criada!");
            }
            setTaskDialog(false);
            setEditingTask(null);
            setTaskForm({ title: "", description: "", priority: "media", columnId: "" });
            if (activeProjectId) fetchProjectDetail(activeProjectId);
        } catch {
            toast.error("Erro ao salvar tarefa");
        } finally {
            setSaving(false);
        }
    };

    /* ─── Delete Task ─── */
    const handleDeleteTask = async (taskId: string) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setColumns(cols => cols.map(col => ({ ...col, tasks: col.tasks.filter(t => t.id !== taskId) })));
            toast.success("Tarefa excluída!");
        } catch {
            toast.error("Erro ao excluir tarefa");
        }
    };

    /* ─── Open Edit Dialog ─── */
    const openEditTask = (task: Task) => {
        setEditingTask(task);
        setTaskForm({
            title: task.title,
            description: task.description || "",
            priority: task.priority,
            columnId: task.columnId,
        });
        setTaskDialog(true);
    };

    /* ─── Open New Task Dialog ─── */
    const openNewTask = (columnId: string) => {
        setEditingTask(null);
        setTaskForm({ title: "", description: "", priority: "media", columnId });
        setTaskDialog(true);
    };

    /* ─── Drag & Drop ─── */
    function findColumnByTaskId(taskId: string) {
        return columns.find(col => col.tasks.some(t => t.id === taskId));
    }

    function onDragStart({ active }: DragStartEvent) {
        const col = findColumnByTaskId(String(active.id));
        setActiveTask(col?.tasks.find(t => t.id === active.id) ?? null);
    }

    async function onDragEnd({ active, over }: DragEndEvent) {
        setActiveTask(null);
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        if (activeId === overId) return;

        const sourceCol = findColumnByTaskId(activeId);
        const destCol = findColumnByTaskId(overId) ?? columns.find(c => c.id === overId);
        if (!sourceCol || !destCol) return;

        if (sourceCol.id === destCol.id) {
            const oldIndex = sourceCol.tasks.findIndex(t => t.id === activeId);
            const newIndex = sourceCol.tasks.findIndex(t => t.id === overId);
            if (oldIndex === -1 || newIndex === -1) return;
            setColumns(cols =>
                cols.map(col =>
                    col.id === sourceCol.id ? { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) } : col
                )
            );
            // Persist order
            const reordered = arrayMove(sourceCol.tasks, oldIndex, newIndex);
            for (let i = 0; i < reordered.length; i++) {
                fetch("/api/tasks", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: reordered[i].id, order: i }),
                }).catch(() => {});
            }
        } else {
            const task = sourceCol.tasks.find(t => t.id === activeId)!;
            const overIndex = destCol.tasks.findIndex(t => t.id === overId);
            const insertAt = overIndex >= 0 ? overIndex : destCol.tasks.length;

            setColumns(cols =>
                cols.map(col => {
                    if (col.id === sourceCol.id)
                        return { ...col, tasks: col.tasks.filter(t => t.id !== activeId) };
                    if (col.id === destCol.id) {
                        const updated = [...col.tasks];
                        updated.splice(insertAt, 0, { ...task, columnId: destCol.id });
                        return { ...col, tasks: updated };
                    }
                    return col;
                })
            );
            // Persist column move
            fetch("/api/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: activeId, columnId: destCol.id, order: insertAt }),
            }).catch(() => {});
        }
    }

    /* ─── Delete Project ─── */
    const handleDeleteProject = async (projectId: string) => {
        try {
            const res = await fetch(`/api/projetos/${projectId}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setProjects(prev => prev.filter(p => p.id !== projectId));
            if (activeProjectId === projectId) {
                const remaining = projects.filter(p => p.id !== projectId);
                setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
            }
            toast.success("Projeto excluído!");
        } catch {
            toast.error("Erro ao excluir projeto");
        }
    };

    /* ─── Loading ─── */
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    /* ─── Empty State ─── */
    if (projects.length === 0) {
        return (
            <div className="h-full flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight theme-title">Projetos & Tarefas</h1>
                        <p className="text-muted-foreground text-sm">Gerencie seu fluxo de trabalho visualmente.</p>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <FolderOpen className="h-16 w-16 text-muted-foreground/30" />
                    <div>
                        <p className="font-semibold text-lg">Nenhum projeto encontrado</p>
                        <p className="text-sm text-muted-foreground">Crie seu primeiro projeto para começar a usar o Kanban.</p>
                    </div>
                    <Button size="lg" className="gap-2" onClick={() => setProjectDialog(true)}>
                        <Plus className="h-5 w-5" /> Novo Projeto
                    </Button>
                </div>

                {/* Project Dialog */}
                <Dialog open={projectDialog} onOpenChange={setProjectDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome do Projeto</Label>
                                <Input value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Ex: Website Corporativo" />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição (opcional)</Label>
                                <Input value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Descrição breve" />
                            </div>
                            <div className="space-y-2">
                                <Label>Cor</Label>
                                <Input type="color" value={projectForm.color} onChange={e => setProjectForm({ ...projectForm, color: e.target.value })} className="h-10 w-20" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setProjectDialog(false)}>Cancelar</Button>
                            <Button onClick={handleCreateProject} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Criar Projeto
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    const activeProject = projects.find(p => p.id === activeProjectId);

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="h-full flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight theme-title">Projetos & Tarefas</h1>
                            <p className="text-muted-foreground text-sm">Gerencie seu fluxo de trabalho visualmente.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={activeProjectId || ""} onValueChange={setActiveProjectId}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Selecione um projeto" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color || "#3b82f6" }} />
                                            {p.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button size="lg" className="gap-2" onClick={() => setProjectDialog(true)}>
                            <Plus className="h-5 w-5" /> Novo Projeto
                        </Button>
                        {activeProject && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>{activeProject.name}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteProject(activeProject.id)} className="text-destructive gap-2">
                                        <Trash className="h-4 w-4" /> Excluir Projeto
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Kanban Columns */}
                <div className="flex gap-6 overflow-x-auto pb-6">
                    {columns.map((column) => (
                        <div key={column.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{column.title}</h3>
                                    <Badge variant="outline" className="rounded-full">{column.tasks.length}</Badge>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openNewTask(column.id)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <DroppableColumn column={column}>
                                    {column.tasks.map((task) => (
                                        <SortableCard
                                            key={task.id}
                                            task={task}
                                            onEdit={() => openEditTask(task)}
                                            onDelete={() => handleDeleteTask(task.id)}
                                        />
                                    ))}
                                    <Button
                                        variant="ghost"
                                        className="w-full text-muted-foreground text-xs hover:text-primary border-none"
                                        onClick={() => openNewTask(column.id)}
                                    >
                                        + Adicionar Tarefa
                                    </Button>
                                </DroppableColumn>
                            </SortableContext>
                        </div>
                    ))}
                </div>
            </div>

            <DragOverlay>{activeTask ? <TaskCard task={activeTask} /> : null}</DragOverlay>

            {/* Task Dialog */}
            <Dialog open={taskDialog} onOpenChange={(open) => { setTaskDialog(open); if (!open) setEditingTask(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Ex: Implementar login" />
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição (opcional)</Label>
                            <Input value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Detalhes da tarefa" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Prioridade</Label>
                                <Select value={taskForm.priority} onValueChange={val => setTaskForm({ ...taskForm, priority: val })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="baixa">Baixa</SelectItem>
                                        <SelectItem value="media">Média</SelectItem>
                                        <SelectItem value="alta">Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Coluna</Label>
                                <Select value={taskForm.columnId} onValueChange={val => setTaskForm({ ...taskForm, columnId: val })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {columns.map(col => (
                                            <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setTaskDialog(false); setEditingTask(null); }}>Cancelar</Button>
                        <Button onClick={handleSaveTask} disabled={saving || !taskForm.title.trim()}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editingTask ? "Salvar" : "Criar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Project Dialog */}
            <Dialog open={projectDialog} onOpenChange={setProjectDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome do Projeto</Label>
                            <Input value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Ex: Website Corporativo" />
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição (opcional)</Label>
                            <Input value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Descrição breve" />
                        </div>
                        <div className="space-y-2">
                            <Label>Cor</Label>
                            <Input type="color" value={projectForm.color} onChange={e => setProjectForm({ ...projectForm, color: e.target.value })} className="h-10 w-20" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProjectDialog(false)}>Cancelar</Button>
                        <Button onClick={handleCreateProject} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Criar Projeto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DndContext>
    );
}
